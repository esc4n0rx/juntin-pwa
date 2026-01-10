import { NextRequest, NextResponse } from 'next/server'
import { groq } from '@/lib/groq/client'
import { verifyToken } from '@/lib/auth-server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

const SYSTEM_PROMPT = `Você é um consultor financeiro especializado em planejamento futuro.

CONTEXTO:
Você está analisando as projeções financeiras dos próximos 30 dias do usuário.

DIRETRIZES:
- Seja proativo e preventivo
- Destaque oportunidades e riscos
- Ofereça dicas práticas e específicas
- Use linguagem clara e objetiva
- Seja encorajador mas realista

FORMATO DE RESPOSTA OBRIGATÓRIO:
Retorne APENAS um objeto JSON válido com esta estrutura:

{
  "titulo": "Título do insight principal em até 80 caracteres",
  "mensagem": "Mensagem principal em até 200 caracteres",
  "tipo": "positivo" | "alerta" | "neutro",
  "dicas": [
    "Dica prática 1: máximo 120 caracteres",
    "Dica prática 2: máximo 120 caracteres",
    "Dica prática 3: máximo 120 caracteres"
  ],
  "destaques": [
    {
      "titulo": "Título curto",
      "valor": "Valor ou informação",
      "tipo": "positivo" | "negativo" | "neutro"
    }
  ]
}

REGRAS:
- "tipo": "positivo" se situação favorável, "alerta" se há riscos, "neutro" se estável
- "titulo": resumo do principal insight
- "mensagem": análise clara da situação financeira futura
- "dicas": ações específicas para melhorar ou manter a situação
- "destaques": 2-3 métricas importantes (ex: "Maior despesa recorrente", "Dias até saldo negativo")

VALIDAÇÃO:
- Use apenas aspas duplas
- Não use quebras de linha nas strings
- Escape caracteres especiais
- NUNCA retorne texto fora do JSON`

type FutureData = {
  currentBalance: number
  projectedBalances: {
    min: number
    max: number
    final: number
  }
  alerts: Array<{
    type: string
    date: string
    message: string
  }>
  recurringCount: number
  daysUntilNegative?: number
  willGoNegative: boolean
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

    // Receber dados de projeções futuras
    const futureData: FutureData = await request.json()

    // Verificar se é uma requisição para forçar refresh
    const url = new URL(request.url)
    const forceRefresh = url.searchParams.get('refresh') === 'true'

    // Criar hash do contexto para verificar cache
    const contextHash = crypto
      .createHash('md5')
      .update(JSON.stringify(futureData))
      .digest('hex')

    // Tentar buscar do cache (se não forçar refresh)
    if (!forceRefresh) {
      const { data: cachedInsight } = await adminDb
        .from('ai_insights_cache')
        .select('insights, expires_at')
        .eq('couple_id', profile.couple_id)
        .eq('insight_type', 'future')
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
    }

    // Montar prompt
    const userPrompt = `
Analise estas projeções financeiras e gere insights:

SITUAÇÃO ATUAL:
- Saldo atual: R$ ${futureData.currentBalance.toFixed(2)}

PROJEÇÕES (30 DIAS):
- Menor saldo projetado: R$ ${futureData.projectedBalances.min.toFixed(2)}
- Maior saldo projetado: R$ ${futureData.projectedBalances.max.toFixed(2)}
- Saldo ao final do período: R$ ${futureData.projectedBalances.final.toFixed(2)}
- Variação: ${futureData.projectedBalances.final >= futureData.currentBalance ? '+' : ''}${(futureData.projectedBalances.final - futureData.currentBalance).toFixed(2)}

RECORRÊNCIAS:
- Contas recorrentes ativas: ${futureData.recurringCount}

ALERTAS DETECTADOS:
${futureData.alerts.length > 0
    ? futureData.alerts.map(a => `- ${a.type === 'negative' ? '⚠️' : '💡'} ${a.message} (${new Date(a.date).toLocaleDateString('pt-BR')})`).join('\n')
    : '- Nenhum alerta'
}

RISCOS:
- Saldo ficará negativo: ${futureData.willGoNegative ? 'Sim' : 'Não'}
${futureData.daysUntilNegative ? `- Dias até saldo negativo: ${futureData.daysUntilNegative}` : ''}

Gere insights inteligentes e acionáveis sobre o futuro financeiro do usuário.`

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
    if (!insights.titulo || !insights.mensagem || !insights.tipo ||
        !insights.dicas || !Array.isArray(insights.dicas) ||
        !insights.destaques || !Array.isArray(insights.destaques)) {
      throw new Error('Estrutura de resposta inválida')
    }

    const finalInsights = {
      titulo: insights.titulo,
      mensagem: insights.mensagem,
      tipo: insights.tipo,
      dicas: insights.dicas.slice(0, 3),
      destaques: insights.destaques.slice(0, 3)
    }

    // Salvar no cache (expira em 1 hora)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    await adminDb
      .from('ai_insights_cache')
      .upsert({
        couple_id: profile.couple_id,
        insight_type: 'future',
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
    console.error('Erro ao gerar insights de futuro:', error)
    return NextResponse.json(
      {
        error: 'Erro ao gerar insights',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
