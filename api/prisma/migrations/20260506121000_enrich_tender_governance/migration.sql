BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[Tender]
ADD [publication_date] DATETIME2 NULL,
    [clarification_deadline] DATETIME2 NULL,
    [site_visit_date] DATETIME2 NULL,
    [site_visit_location] NVARCHAR(1000) NULL,
    [submission_mode] NVARCHAR(1000) NOT NULL CONSTRAINT [Tender_submission_mode_df] DEFAULT N'PLATFORM',
    [evaluation_method] NVARCHAR(1000) NOT NULL CONSTRAINT [Tender_evaluation_method_df] DEFAULT N'WEIGHTED',
    [technical_weight] FLOAT CONSTRAINT [Tender_technical_weight_df] DEFAULT 60,
    [financial_weight] FLOAT CONSTRAINT [Tender_financial_weight_df] DEFAULT 40,
    [commercial_weight] FLOAT CONSTRAINT [Tender_commercial_weight_df] DEFAULT 0,
    [award_notes] NVARCHAR(MAX) NULL;

CREATE TABLE [dbo].[TenderInvitation] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tender_id] INT NOT NULL,
    [supplier_id] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [contact_email] NVARCHAR(1000) NULL,
    [response_status] NVARCHAR(1000) NOT NULL CONSTRAINT [TenderInvitation_response_status_df] DEFAULT N'INVITED',
    [invited_at] DATETIME2 NOT NULL CONSTRAINT [TenderInvitation_invited_at_df] DEFAULT CURRENT_TIMESTAMP,
    [responded_at] DATETIME2 NULL,
    [notes] NVARCHAR(MAX) NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [TenderInvitation_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [created_by] INT NOT NULL,
    CONSTRAINT [TenderInvitation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TenderInvitation_tender_id_supplier_id_key] UNIQUE NONCLUSTERED ([tender_id], [supplier_id]),
    CONSTRAINT [TenderInvitation_tender_id_fkey] FOREIGN KEY ([tender_id]) REFERENCES [dbo].[Tender]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [TenderInvitation_supplier_id_fkey] FOREIGN KEY ([supplier_id]) REFERENCES [dbo].[Supplier]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [TenderInvitation_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [TenderInvitation_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE NONCLUSTERED INDEX [TenderInvitation_supplier_id_idx]
    ON [dbo].[TenderInvitation]([supplier_id]);

CREATE NONCLUSTERED INDEX [TenderInvitation_tenant_id_idx]
    ON [dbo].[TenderInvitation]([tenant_id]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
