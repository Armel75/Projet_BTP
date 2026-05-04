BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ProjectPhaseTransition] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [from_phase] NVARCHAR(1000) NOT NULL,
    [to_phase] NVARCHAR(1000) NOT NULL,
    [reason] NVARCHAR(max),
    [changed_by] INT,
    [changed_at] DATETIME2 NOT NULL CONSTRAINT [ProjectPhaseTransition_changed_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ProjectPhaseTransition_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ProjectPhaseTransition_tenant_id_project_id_changed_at_idx] ON [dbo].[ProjectPhaseTransition]([tenant_id], [project_id], [changed_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ProjectPhaseTransition_tenant_id_to_phase_changed_at_idx] ON [dbo].[ProjectPhaseTransition]([tenant_id], [to_phase], [changed_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ProjectPhaseTransition_project_id_changed_at_idx] ON [dbo].[ProjectPhaseTransition]([project_id], [changed_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Project_tenant_id_phase_idx] ON [dbo].[Project]([tenant_id], [phase]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Project_phase_idx] ON [dbo].[Project]([phase]);

-- AddForeignKey
ALTER TABLE [dbo].[ProjectPhaseTransition] ADD CONSTRAINT [ProjectPhaseTransition_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProjectPhaseTransition] ADD CONSTRAINT [ProjectPhaseTransition_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProjectPhaseTransition] ADD CONSTRAINT [ProjectPhaseTransition_changed_by_fkey] FOREIGN KEY ([changed_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
