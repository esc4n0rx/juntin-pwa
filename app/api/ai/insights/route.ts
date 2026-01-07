import { NextRequest, NextResponse } from 'next/server'
import { groq } from '@/lib/groq/client'
import { verifyToken } from '@/lib/auth-server'
import { cookies } from 'next/headers'

const SYSTEM_PROMPT = `Você é um assistente financeiro especializado em análise de despesas pessoais e familiares.

DIRETRIZES GERAIS:
- Seja objetivo, claro e direto
- Use linguagem acessível e amigável
- Forneça insights práticos e acionáveis
- Evite jargões financeiros complexos
- Seja positivo mas realista
- Adapte o tom ao contexto (individual ou casal)

FORMATO DE RESPOSTA OBRIGATÓRIO:
Você DEVE retornar APENAS um objeto JSON válido, sem texto adicional antes ou depois.
O JSON deve ter exatamente esta estrutura:

{
  "analises": [
    "Análise 1: máximo 120 caracteres",
    "Análise 2: máximo 120 caracteres",
    "Análise 3: máximo 120 caracteres"
  ],
  "dicas": [
    "Dica 1: máximo 100 caracteres",
    "Dica 2: máximo 100 caracteres",
    "Dica 3: máximo 100 caracteres",
    "Dica 4: máximo 100 caracteres"
  ]
}

REGRAS PARA ANÁLISES (3-5 análises):
- Foque nos padrões de gastos identificados
- Destaque a categoria com maior despesa
- Analise a relação receita vs despesa
- Identifique tendências positivas ou negativas
- Seja específico com números e percentuais

REGRAS PARA DICAS (exatamente 4 dicas):
- Dicas práticas e aplicáveis imediatamente
- Relacionadas aos dados fornecidos
- Priorizadas por impacto potencial
- Motivacionais quando apropriado
- Variadas entre categorias

VALIDAÇÃO:
- Todas as strings devem estar entre aspas duplas
- Não use aspas simples dentro das strings
- Não use quebras de linha dentro das strings
- Use apenas caracteres UTF-8 válidos
- Escape caracteres especiais se necessário
- NUNCA retorne texto antes ou depois do JSON`

type FinancialData = {
  totalExpenses: number
  totalIncome: number
  balance: number
  period: string
  transactions: {
    expenses: number
    incomes: number
    total: number
  }
  topCategories: {
    name: string
    amount: number
    percentage: number
    count: number
  }[]
  mode: 'individual' | 'couple'
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

    // Receber dados financeiros do frontend
    const financialData: FinancialData = await request.json()

    // Montar o prompt do usuário com os dados
    const userPrompt = `
Analise os seguintes dados financeiros e gere insights:

MODO: ${financialData.mode === 'couple' ? 'Casal' : 'Individual'}
PERÍODO: ${financialData.period}

RESUMO FINANCEIRO:
- Total de Receitas: R$ ${financialData.totalIncome.toFixed(2)}
- Total de Despesas: R$ ${financialData.totalExpenses.toFixed(2)}
- Saldo: R$ ${financialData.balance.toFixed(2)}
- Status: ${financialData.balance >= 0 ? 'Positivo' : 'Negativo'}

TRANSAÇÕES:
- Total de lançamentos: ${financialData.transactions.total}
- Despesas registradas: ${financialData.transactions.expenses}
- Receitas registradas: ${financialData.transactions.incomes}

TOP CATEGORIAS DE DESPESAS:
${financialData.topCategories.slice(0, 5).map((cat, idx) =>
  `${idx + 1}. ${cat.name}: R$ ${cat.amount.toFixed(2)} (${cat.percentage.toFixed(1)}% do total) - ${cat.count} lançamentos`
).join('\n')}

Gere análises perspicazes e dicas práticas baseadas nesses dados.`

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

    // Parse e validação da resposta
    let insights
    try {
      insights = JSON.parse(responseContent)
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta:', responseContent)
      throw new Error('Formato de resposta inválido da IA')
    }

    // Validação da estrutura
    if (!insights.analises || !Array.isArray(insights.analises) ||
        !insights.dicas || !Array.isArray(insights.dicas)) {
      throw new Error('Estrutura de resposta inválida')
    }

    // Garantir que temos exatamente 4 dicas
    if (insights.dicas.length < 4) {
      insights.dicas = [
        ...insights.dicas,
        ...Array(4 - insights.dicas.length).fill('Continue monitorando seus gastos para melhores resultados.')
      ]
    } else if (insights.dicas.length > 4) {
      insights.dicas = insights.dicas.slice(0, 4)
    }

    return NextResponse.json({
      success: true,
      insights: {
        analises: insights.analises,
        dicas: insights.dicas.slice(0, 4) // Garantir máximo de 4 dicas
      }
    })

  } catch (error: unknown) {
    console.error('Erro ao gerar insights:', error)
    return NextResponse.json(
      {
        error: 'Erro ao gerar insights',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
