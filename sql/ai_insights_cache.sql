-- Tabela de cache para insights de IA
CREATE TABLE IF NOT EXISTS ai_insights_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL, -- 'future' ou 'simulation'

    -- Dados do contexto (para validar se cache ainda é válido)
    context_hash TEXT NOT NULL, -- Hash dos dados de entrada

    -- Insights gerados pela IA
    insights JSONB NOT NULL,

    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    -- Índices para busca rápida
    UNIQUE(couple_id, insight_type, context_hash)
);

-- Índice para limpeza automática de cache expirado
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires
ON ai_insights_cache(expires_at);

-- Índice para busca por couple_id e tipo
CREATE INDEX IF NOT EXISTS idx_ai_cache_couple_type
ON ai_insights_cache(couple_id, insight_type);

-- Função para limpar cache expirado automaticamente
CREATE OR REPLACE FUNCTION clean_expired_ai_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM ai_insights_cache
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comentários nas colunas
COMMENT ON TABLE ai_insights_cache IS 'Cache de insights gerados pela IA para economizar tokens';
COMMENT ON COLUMN ai_insights_cache.insight_type IS 'Tipo de insight: future (projeções) ou simulation (simulações)';
COMMENT ON COLUMN ai_insights_cache.context_hash IS 'Hash MD5 dos dados de entrada para validar se cache ainda é válido';
COMMENT ON COLUMN ai_insights_cache.insights IS 'Insights em formato JSON retornados pela IA';
COMMENT ON COLUMN ai_insights_cache.expires_at IS 'Data de expiração do cache (padrão: 1 hora)';
