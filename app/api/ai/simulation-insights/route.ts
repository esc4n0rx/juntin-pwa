import { NextRequest, NextResponse } from 'next/server'
import { groq } from '@/lib/groq/client'
import { verifyToken } from '@/lib/auth-server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

const SYSTEM_PROMPT = `Você é um assistente financeiro especializado em análise de cenários hipotéticos.

CONTEXTO:
O usuário está simulando uma compra ou despesa futura e quer entender o impacto financeiro.

DIRETRIZES:
- Seja objetivo e prático
- Foque em viabilidade e riscos
- Ofereça alternativas quando necessário
- Seja realista mas não desanimador
- Use linguagem simples e amigável

FORMATO DE RESPOSTA OBRIGATÓRIO:
Retorne APENAS um objeto JSON válido com esta estrutura:

{
  "viabilidade": "sim" | "nao" | "parcial",
  "mensagem": "Resumo da viabilidade em até 150 caracteres",
  "impacto": "Descrição do impacto financeiro em até 200 caracteres",
  "dicas": [
    "Dica prática 1: máximo 120 caracteres",
    "Dica prática 2: máximo 120 caracteres",
    "Dica prática 3: máximo 120 caracteres"
  ],
  "alternativas": [
    "Sugestão alternativa 1: máximo 100 caracteres",
    "Sugestão alternativa 2: máximo 100 caracteres"
  ]
}

REGRAS:
- "viabilidade": "sim" se não causar saldo negativo, "parcial" se comprometer <50% do saldo, "nao" se inviabilizar
- "mensagem": resumo claro da situação
- "impacto": quanto tempo para recuperar, comprometimento do saldo, etc
- "dicas": ações práticas para viabilizar ou minimizar impacto
- "alternativas": outras formas de alcançar o objetivo ou reduzir custos

VALIDAÇÃO:
- Use apenas aspas duplas
- Não use quebras de linha nas strings
- Escape caracteres especiais
- NUNCA retorne texto fora do JSON`

type SimulationData = {
  type: 'one-time' | 'recurring'
  description: string
  amount: number
  date: string
  frequency?: string
  currentBalance: number
  projectedBalanceAfter: number
  willGoNegative: boolean
  daysUntilNegative?: number
}

export async function POST(request: NextRequest) {
  try {
    // Autenticação
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const adminDb = createAdminClient()

    // Buscar couple_id
    const { data: profile } = await adminDb
      .from('profiles')
      .select('couple_id')
      .eq('id', payload.userId)
      .single()

    if (!profile?.couple_id) {
      return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 400 })
    }

    // Receber dados da simulação
    const simulationData: SimulationData = await request.json()

    // Criar hash do contexto
    const contextHash = crypto
      .createHash('md5')
      .update(JSON.stringify(simulationData))
      .digest('hex')

    // Tentar buscar do cache
    const { data: cachedInsight } = await adminDb
      .from('ai_insights_cache')
      .select('insights, expires_at')
      .eq('couple_id', profile.couple_id)
      .eq('insight_type', 'simulation')
      .eq('context_hash', contextHash)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (cachedInsight) {
      return NextResponse.json({
        success: true,
        insights: cachedInsight.insights,
        cached: true,
        expires_at: cachedInsight.expires_at
      })
    }

    // Montar prompt do usuário
    const userPrompt = `
Analise esta simulação financeira e forneça insights:

SIMULAÇÃO:
- Tipo: ${simulationData.type === 'one-time' ? 'Despesa única' : `Despesa recorrente (${simulationData.frequency})`}
- Descrição: ${simulationData.description}
- Valor: R$ ${simulationData.amount.toFixed(2)}
- Data: ${new Date(simulationData.date + 'T00:00:00').toLocaleDateString('pt-BR')}

SITUAÇÃO FINANCEIRA:
- Saldo atual: R$ ${simulationData.currentBalance.toFixed(2)}
- Saldo projetado após: R$ ${simulationData.projectedBalanceAfter.toFixed(2)}
- Impacto: ${simulationData.currentBalance - simulationData.projectedBalanceAfter >= 0
    ? `Redução de R$ ${(simulationData.currentBalance - simulationData.projectedBalanceAfter).toFixed(2)}`
    : `Déficit de R$ ${Math.abs(simulationData.currentBalance - simulationData.projectedBalanceAfter).toFixed(2)}`}
- Ficará negativo: ${simulationData.willGoNegative ? 'Sim' : 'Não'}
${simulationData.daysUntilNegative ? `- Dias até saldo negativo: ${simulationData.daysUntilNegative}` : ''}

Analise a viabilidade dessa compra e dê dicas práticas para o usuário.`

    // Chamar a API do Groq
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_completion_tokens: 1024,
      top_p: 0.9,
      response_format: { type: "json_object" }
    })

    const responseContent = completion.choices[0]?.message?.content

    if (!responseContent) {
      throw new Error('Resposta vazia da IA')
    }

    // Parse e validação
    let insights
    try {
      insights = JSON.parse(responseContent)
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta:', responseContent)
      throw new Error('Formato de resposta inválido da IA')
    }

    // Validação da estrutura
    if (!insights.viabilidade || !insights.mensagem || !insights.impacto ||
        !insights.dicas || !Array.isArray(insights.dicas) ||
        !insights.alternativas || !Array.isArray(insights.alternativas)) {
      throw new Error('Estrutura de resposta inválida')
    }

    const finalInsights = {
      viabilidade: insights.viabilidade,
      mensagem: insights.mensagem,
      impacto: insights.impacto,
      dicas: insights.dicas.slice(0, 3),
      alternativas: insights.alternativas.slice(0, 2)
    }

    // Salvar no cache (expira em 24 horas - simulações são mais estáveis)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    await adminDb
      .from('ai_insights_cache')
      .upsert({
        couple_id: profile.couple_id,
        insight_type: 'simulation',
        context_hash: contextHash,
        insights: finalInsights,
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'couple_id,insight_type,context_hash'
      })

    return NextResponse.json({
      success: true,
      insights: finalInsights,
      cached: false,
      expires_at: expiresAt.toISOString()
    })

  } catch (error: unknown) {
    console.error('Erro ao gerar insights de simulação:', error)
    return NextResponse.json(
      {
        error: 'Erro ao gerar insights',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
