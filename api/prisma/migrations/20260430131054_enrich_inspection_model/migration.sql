BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Inspection] ADD [description] NVARCHAR(max),
[inspector_id] INT,
[location] NVARCHAR(1000),
[reference_norm] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[InspectionItem] ADD [category] NVARCHAR(1000),
[order] INT NOT NULL CONSTRAINT [InspectionItem_order_df] DEFAULT 0;

-- CreateIndex
CREATE NONCLUSTERED INDEX [Inspection_inspector_id_idx] ON [dbo].[Inspection]([inspector_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Inspection_tenant_id_project_id_idx] ON [dbo].[Inspection]([tenant_id], [project_id]);

-- AddForeignKey
ALTER TABLE [dbo].[Inspection] ADD CONSTRAINT [Inspection_inspector_id_fkey] FOREIGN KEY ([inspector_id]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
