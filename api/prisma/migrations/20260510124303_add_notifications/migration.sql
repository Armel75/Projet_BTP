BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[NotificationEvent] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenant_id] INT NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [priority] NVARCHAR(1000) NOT NULL CONSTRAINT [NotificationEvent_priority_df] DEFAULT 'MEDIUM',
    [entity_type] NVARCHAR(1000),
    [entity_id] INT,
    [payload] NVARCHAR(max),
    [expires_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [NotificationEvent_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [NotificationEvent_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[NotificationDelivery] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenant_id] INT NOT NULL,
    [event_id] INT NOT NULL,
    [recipient_id] INT NOT NULL,
    [channel] NVARCHAR(1000) NOT NULL,
    [subject] NVARCHAR(1000),
    [body] NVARCHAR(max),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [NotificationDelivery_status_df] DEFAULT 'PENDING',
    [is_read] BIT NOT NULL CONSTRAINT [NotificationDelivery_is_read_df] DEFAULT 0,
    [read_at] DATETIME2,
    [sent_at] DATETIME2,
    [failed_at] DATETIME2,
    [error_message] NVARCHAR(1000),
    [retry_count] INT NOT NULL CONSTRAINT [NotificationDelivery_retry_count_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [NotificationDelivery_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [NotificationDelivery_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[NotificationPreference] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenant_id] INT NOT NULL,
    [user_id] INT NOT NULL,
    [notification_type] NVARCHAR(1000) NOT NULL,
    [channel] NVARCHAR(1000) NOT NULL,
    [enabled] BIT NOT NULL CONSTRAINT [NotificationPreference_enabled_df] DEFAULT 1,
    [digest_mode] NVARCHAR(1000) NOT NULL CONSTRAINT [NotificationPreference_digest_mode_df] DEFAULT 'IMMEDIATE',
    CONSTRAINT [NotificationPreference_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [NotificationPreference_tenant_id_user_id_notification_type_channel_key] UNIQUE NONCLUSTERED ([tenant_id],[user_id],[notification_type],[channel])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NotificationEvent_tenant_id_type_idx] ON [dbo].[NotificationEvent]([tenant_id], [type]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NotificationEvent_tenant_id_entity_type_entity_id_idx] ON [dbo].[NotificationEvent]([tenant_id], [entity_type], [entity_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NotificationEvent_tenant_id_created_at_idx] ON [dbo].[NotificationEvent]([tenant_id], [created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NotificationDelivery_tenant_id_recipient_id_is_read_idx] ON [dbo].[NotificationDelivery]([tenant_id], [recipient_id], [is_read]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NotificationDelivery_tenant_id_recipient_id_channel_idx] ON [dbo].[NotificationDelivery]([tenant_id], [recipient_id], [channel]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NotificationDelivery_tenant_id_status_idx] ON [dbo].[NotificationDelivery]([tenant_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NotificationDelivery_tenant_id_channel_status_idx] ON [dbo].[NotificationDelivery]([tenant_id], [channel], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NotificationDelivery_event_id_idx] ON [dbo].[NotificationDelivery]([event_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NotificationPreference_tenant_id_user_id_idx] ON [dbo].[NotificationPreference]([tenant_id], [user_id]);

-- AddForeignKey
ALTER TABLE [dbo].[NotificationEvent] ADD CONSTRAINT [NotificationEvent_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NotificationDelivery] ADD CONSTRAINT [NotificationDelivery_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NotificationDelivery] ADD CONSTRAINT [NotificationDelivery_event_id_fkey] FOREIGN KEY ([event_id]) REFERENCES [dbo].[NotificationEvent]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NotificationDelivery] ADD CONSTRAINT [NotificationDelivery_recipient_id_fkey] FOREIGN KEY ([recipient_id]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NotificationPreference] ADD CONSTRAINT [NotificationPreference_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NotificationPreference] ADD CONSTRAINT [NotificationPreference_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
