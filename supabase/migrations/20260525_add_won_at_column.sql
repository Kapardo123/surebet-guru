-- Migration: Add won_at column to tips table
-- Description: Stores timestamp when tip status changed to "won"
-- Used for: 12-hour visibility rule for won tips

ALTER TABLE tips 
ADD COLUMN IF NOT EXISTS won_at TIMESTAMPTZ;

-- Create index for faster filtering by won_at
CREATE INDEX IF NOT EXISTS idx_tips_won_at ON tips(won_at);

-- Comment
COMMENT ON COLUMN tips.won_at IS 'ISO timestamp when tip was marked as won. Used for 12-hour visibility after win.';
