BEGIN TRY

BEGIN TRAN;

IF EXISTS (
    SELECT 1
    FROM [dbo].[Task]
    WHERE [lot_id] IS NULL
)
BEGIN
    THROW 50000, 'Migration bloquee: certaines taches n''ont pas de lot. Assignez un lot a chaque tache avant d''appliquer cette migration.', 1;
END;

-- Drop index before altering column (compatible with SQL Server versions that do not support DROP INDEX IF EXISTS)
IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'Task_lot_id_idx'
      AND object_id = OBJECT_ID(N'[dbo].[Task]')
)
BEGIN
    DROP INDEX [Task_lot_id_idx] ON [dbo].[Task];
END;

ALTER TABLE [dbo].[Task] ALTER COLUMN [lot_id] INT NOT NULL;

-- Recreate index
CREATE INDEX [Task_lot_id_idx] ON [dbo].[Task]([lot_id]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
