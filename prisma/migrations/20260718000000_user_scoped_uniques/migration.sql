-- Make uniqueness constraints user-scoped for true multi-tenant isolation

-- Week: allow same (weekNum, year) across different users
DROP INDEX IF EXISTS "Week_weekNum_year_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Week_userId_weekNum_year_key" ON "Week"("userId", "weekNum", "year");

-- Store: allow same external storeId across different users
DROP INDEX IF EXISTS "Store_storeId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Store_userId_storeId_key" ON "Store"("userId", "storeId");

-- ContactTeam: allow same team names across different users
DROP INDEX IF EXISTS "ContactTeam_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ContactTeam_userId_name_key" ON "ContactTeam"("userId", "name");

-- GlossaryTerm: allow same term across different users
DROP INDEX IF EXISTS "GlossaryTerm_term_key";
CREATE UNIQUE INDEX IF NOT EXISTS "GlossaryTerm_userId_term_key" ON "GlossaryTerm"("userId", "term");
