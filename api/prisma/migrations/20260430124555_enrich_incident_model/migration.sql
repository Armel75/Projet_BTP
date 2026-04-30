/*
  Warnings:

  - Added the required column `updated_at` to the `Incident` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Incident] ADD [assigned_to_id] INT,
[cost_impact] FLOAT(53),
[delay_impact_days] INT,
[incident_date] DATETIME2,
[root_cause] NVARCHAR(max),
[updated_at] DATETIME2 NOT NULL;

-- CreateIndex
CREATE NONCLUSTERED INDEX [Incident_assigned_to_id_idx] ON [dbo].[Incident]([assigned_to_id]);

-- AddForeignKey
ALTER TABLE [dbo].[Incident] ADD CONSTRAINT [Incident_assigned_to_id_fkey] FOREIGN KEY ([assigned_to_id]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
