CREATE TABLE instruments (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol  VARCHAR(16)  NOT NULL UNIQUE,
    name    VARCHAR(200) NOT NULL,
    isin    VARCHAR(12)  UNIQUE,
    type    VARCHAR(8)   NOT NULL CHECK (type IN ('STOCK', 'ETF')),
    sector  VARCHAR(100),
    active  BOOLEAN      NOT NULL DEFAULT TRUE
);
