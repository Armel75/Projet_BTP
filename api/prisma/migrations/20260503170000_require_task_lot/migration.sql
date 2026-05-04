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

ALTER TABLE [dbo].[Task] ALTER COLUMN [lot_id] INT NOT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
