-- Add RLS policies for expense_line_items table
-- These policies ensure users can only access line items for their own expenses

-- SELECT policy
CREATE POLICY "Users can view expense line items for their expenses"
ON expense_line_items
FOR SELECT
USING (expense_id IN (SELECT id FROM expenses WHERE user_id = auth.uid()));

-- INSERT policy
CREATE POLICY "Users can insert expense line items for their expenses"
ON expense_line_items
FOR INSERT
WITH CHECK (expense_id IN (SELECT id FROM expenses WHERE user_id = auth.uid()));

-- UPDATE policy
CREATE POLICY "Users can update expense line items for their expenses"
ON expense_line_items
FOR UPDATE
USING (expense_id IN (SELECT id FROM expenses WHERE user_id = auth.uid()));

-- DELETE policy
CREATE POLICY "Users can delete expense line items for their expenses"
ON expense_line_items
FOR DELETE
USING (expense_id IN (SELECT id FROM expenses WHERE user_id = auth.uid()));
