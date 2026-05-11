/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,reference]` on the table `Contract` will be added. If there are existing duplicate values, this will fail.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[ControlReport] ADD [approval_workflow_status] NVARCHAR(1000) CONSTRAINT [ControlReport_approval_workflow_status_df] DEFAULT 'DRAFT',
[archived_at] DATETIME2,
[assigned_to_id] INT,
[category] NVARCHAR(1000),
[closed_at] DATETIME2,
[closure_summary] NVARCHAR(max),
[corrective_action_summary] NVARCHAR(max),
[escalation_level] INT NOT NULL CONSTRAINT [ControlReport_escalation_level_df] DEFAULT 0,
[evidence_count] INT NOT NULL CONSTRAINT [ControlReport_evidence_count_df] DEFAULT 0,
[first_response_at] DATETIME2,
[initial_status] NVARCHAR(1000),
[inspection_method] NVARCHAR(1000),
[is_archived] BIT NOT NULL CONSTRAINT [ControlReport_is_archived_df] DEFAULT 0,
[last_status_changed_at] DATETIME2,
[latitude] FLOAT(53),
[longitude] FLOAT(53),
[observed_by_company] NVARCHAR(1000),
[observed_by_name] NVARCHAR(1000),
[open_actions_count] INT NOT NULL CONSTRAINT [ControlReport_open_actions_count_df] DEFAULT 0,
[preventive_action_summary] NVARCHAR(max),
[priority] NVARCHAR(1000) NOT NULL CONSTRAINT [ControlReport_priority_df] DEFAULT 'MEDIUM',
[revision_no] INT NOT NULL CONSTRAINT [ControlReport_revision_no_df] DEFAULT 1,
[root_cause] NVARCHAR(max),
[sla_breached] BIT NOT NULL CONSTRAINT [ControlReport_sla_breached_df] DEFAULT 0,
[source_channel] NVARCHAR(1000) CONSTRAINT [ControlReport_source_channel_df] DEFAULT 'MANUAL',
[sub_discipline] NVARCHAR(1000),
[target_resolution_at] DATETIME2,
[target_response_at] DATETIME2,
[zone_code] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[ControlReportAction] ADD [action_type] NVARCHAR(1000) NOT NULL CONSTRAINT [ControlReportAction_action_type_df] DEFAULT 'CORRECTIVE',
[archived_at] DATETIME2,
[completion_evidence_url] NVARCHAR(1000),
[escalated_at] DATETIME2,
[escalation_level] INT NOT NULL CONSTRAINT [ControlReportAction_escalation_level_df] DEFAULT 0,
[escalation_reason] NVARCHAR(max),
[is_archived] BIT NOT NULL CONSTRAINT [ControlReportAction_is_archived_df] DEFAULT 0,
[is_overdue] BIT NOT NULL CONSTRAINT [ControlReportAction_is_overdue_df] DEFAULT 0,
[owner_name] NVARCHAR(1000),
[priority] NVARCHAR(1000) NOT NULL CONSTRAINT [ControlReportAction_priority_df] DEFAULT 'MEDIUM',
[reopened_count] INT NOT NULL CONSTRAINT [ControlReportAction_reopened_count_df] DEFAULT 0,
[sequence_no] INT NOT NULL CONSTRAINT [ControlReportAction_sequence_no_df] DEFAULT 0,
[started_at] DATETIME2,
[verification_note] NVARCHAR(max),
[verified_at] DATETIME2,
[verified_by] INT;

-- AlterTable
ALTER TABLE [dbo].[ControlReportAttachment] ADD [archived_at] DATETIME2,
[checksum_sha256] NVARCHAR(1000),
[external_id] NVARCHAR(1000),
[external_system] NVARCHAR(1000),
[file_size_bytes] INT,
[is_archived] BIT NOT NULL CONSTRAINT [ControlReportAttachment_is_archived_df] DEFAULT 0,
[is_primary_evidence] BIT NOT NULL CONSTRAINT [ControlReportAttachment_is_primary_evidence_df] DEFAULT 0,
[latitude] FLOAT(53),
[longitude] FLOAT(53),
[mime_type] NVARCHAR(1000),
[source_updated_at] DATETIME2,
[storage_key] NVARCHAR(1000),
[taken_at] DATETIME2,
[uploaded_by] INT;

-- AlterTable
ALTER TABLE [dbo].[Incident] ADD [acknowledged_at] DATETIME2,
[target_resolution_at] DATETIME2;

-- AlterTable
ALTER TABLE [dbo].[ProjectLot] ADD [archived_at] DATETIME2,
[is_archived] BIT NOT NULL CONSTRAINT [ProjectLot_is_archived_df] DEFAULT 0,
[schedule_status] NVARCHAR(1000) NOT NULL CONSTRAINT [ProjectLot_schedule_status_df] DEFAULT 'ON_TRACK';

-- AlterTable
ALTER TABLE [dbo].[Task] ADD [archived_at] DATETIME2,
[created_at] DATETIME2 NOT NULL CONSTRAINT [Task_created_at_df] DEFAULT CURRENT_TIMESTAMP,
[is_archived] BIT NOT NULL CONSTRAINT [Task_is_archived_df] DEFAULT 0,
[schedule_status] NVARCHAR(1000) NOT NULL CONSTRAINT [Task_schedule_status_df] DEFAULT 'ON_TRACK';

-- CreateTable
CREATE TABLE [dbo].[ExecutionNote] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenant_id] INT NOT NULL,
    [project_id] INT NOT NULL,
    [lot_id] INT,
    [task_id] INT,
    [incident_id] INT,
    [parent_id] INT,
    [content] NVARCHAR(max) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL CONSTRAINT [ExecutionNote_category_df] DEFAULT 'INFO',
    [visibility] NVARCHAR(1000) NOT NULL CONSTRAINT [ExecutionNote_visibility_df] DEFAULT 'INTERNAL',
    [source] NVARCHAR(1000) NOT NULL CONSTRAINT [ExecutionNote_source_df] DEFAULT 'MANUAL',
    [requires_attention] BIT NOT NULL CONSTRAINT [ExecutionNote_requires_attention_df] DEFAULT 0,
    [is_pinned] BIT NOT NULL CONSTRAINT [ExecutionNote_is_pinned_df] DEFAULT 0,
    [metadata_json] NVARCHAR(max),
    [created_by] INT,
    [edited_by] INT,
    [edited_at] DATETIME2,
    [resolved_at] DATETIME2,
    [deleted_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ExecutionNote_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [ExecutionNote_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TaskStatusHistory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [task_id] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [from_status] NVARCHAR(1000),
    [to_status] NVARCHAR(1000),
    [from_schedule_status] NVARCHAR(1000),
    [to_schedule_status] NVARCHAR(1000),
    [reason] NVARCHAR(max),
    [comment] NVARCHAR(max),
    [changed_by] INT,
    [changed_at] DATETIME2 NOT NULL CONSTRAINT [TaskStatusHistory_changed_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TaskStatusHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[LotStatusHistory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [lot_id] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [from_status] NVARCHAR(1000),
    [to_status] NVARCHAR(1000),
    [from_schedule_status] NVARCHAR(1000),
    [to_schedule_status] NVARCHAR(1000),
    [reason] NVARCHAR(max),
    [comment] NVARCHAR(max),
    [changed_by] INT,
    [changed_at] DATETIME2 NOT NULL CONSTRAINT [LotStatusHistory_changed_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [LotStatusHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[IncidentStatusHistory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [incident_id] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [from_status] NVARCHAR(1000),
    [to_status] NVARCHAR(1000) NOT NULL,
    [from_severity] NVARCHAR(1000),
    [to_severity] NVARCHAR(1000),
    [reason] NVARCHAR(max),
    [comment] NVARCHAR(max),
    [changed_by] INT,
    [changed_at] DATETIME2 NOT NULL CONSTRAINT [IncidentStatusHistory_changed_at_df] DEFAULT CURRENT_TIMESTAMP,
    [snapshot_json] NVARCHAR(max),
    CONSTRAINT [IncidentStatusHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ControlReportStatusHistory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [control_report_id] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [from_status] NVARCHAR(1000),
    [to_status] NVARCHAR(1000) NOT NULL,
    [changed_at] DATETIME2 NOT NULL CONSTRAINT [ControlReportStatusHistory_changed_at_df] DEFAULT CURRENT_TIMESTAMP,
    [changed_by] INT,
    [reason] NVARCHAR(max),
    [comment] NVARCHAR(max),
    [sla_breached] BIT NOT NULL CONSTRAINT [ControlReportStatusHistory_sla_breached_df] DEFAULT 0,
    [snapshot_json] NVARCHAR(max),
    CONSTRAINT [ControlReportStatusHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ControlReportChecklistItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [control_report_id] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [item_code] NVARCHAR(1000),
    [label] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
    [result] NVARCHAR(1000) NOT NULL CONSTRAINT [ControlReportChecklistItem_result_df] DEFAULT 'PENDING',
    [value_text] NVARCHAR(1000),
    [value_number] FLOAT(53),
    [unit] NVARCHAR(1000),
    [tolerance_min] FLOAT(53),
    [tolerance_max] FLOAT(53),
    [is_mandatory] BIT NOT NULL CONSTRAINT [ControlReportChecklistItem_is_mandatory_df] DEFAULT 1,
    [evidence_required] BIT NOT NULL CONSTRAINT [ControlReportChecklistItem_evidence_required_df] DEFAULT 0,
    [sequence_no] INT NOT NULL CONSTRAINT [ControlReportChecklistItem_sequence_no_df] DEFAULT 0,
    [checked_by] INT,
    [checked_at] DATETIME2,
    [note] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ControlReportChecklistItem_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [ControlReportChecklistItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExecutionNote_tenant_id_project_id_created_at_idx] ON [dbo].[ExecutionNote]([tenant_id], [project_id], [created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExecutionNote_lot_id_created_at_idx] ON [dbo].[ExecutionNote]([lot_id], [created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExecutionNote_task_id_created_at_idx] ON [dbo].[ExecutionNote]([task_id], [created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExecutionNote_incident_id_created_at_idx] ON [dbo].[ExecutionNote]([incident_id], [created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExecutionNote_parent_id_idx] ON [dbo].[ExecutionNote]([parent_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExecutionNote_tenant_id_requires_attention_resolved_at_idx] ON [dbo].[ExecutionNote]([tenant_id], [requires_attention], [resolved_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExecutionNote_tenant_id_deleted_at_idx] ON [dbo].[ExecutionNote]([tenant_id], [deleted_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskStatusHistory_task_id_changed_at_idx] ON [dbo].[TaskStatusHistory]([task_id], [changed_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskStatusHistory_tenant_id_changed_at_idx] ON [dbo].[TaskStatusHistory]([tenant_id], [changed_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskStatusHistory_tenant_id_to_status_idx] ON [dbo].[TaskStatusHistory]([tenant_id], [to_status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskStatusHistory_tenant_id_to_schedule_status_idx] ON [dbo].[TaskStatusHistory]([tenant_id], [to_schedule_status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LotStatusHistory_lot_id_changed_at_idx] ON [dbo].[LotStatusHistory]([lot_id], [changed_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LotStatusHistory_tenant_id_changed_at_idx] ON [dbo].[LotStatusHistory]([tenant_id], [changed_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LotStatusHistory_tenant_id_to_status_idx] ON [dbo].[LotStatusHistory]([tenant_id], [to_status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LotStatusHistory_tenant_id_to_schedule_status_idx] ON [dbo].[LotStatusHistory]([tenant_id], [to_schedule_status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IncidentStatusHistory_incident_id_changed_at_idx] ON [dbo].[IncidentStatusHistory]([incident_id], [changed_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IncidentStatusHistory_tenant_id_changed_at_idx] ON [dbo].[IncidentStatusHistory]([tenant_id], [changed_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IncidentStatusHistory_tenant_id_to_status_idx] ON [dbo].[IncidentStatusHistory]([tenant_id], [to_status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReportStatusHistory_control_report_id_changed_at_idx] ON [dbo].[ControlReportStatusHistory]([control_report_id], [changed_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReportStatusHistory_tenant_id_changed_at_idx] ON [dbo].[ControlReportStatusHistory]([tenant_id], [changed_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReportStatusHistory_to_status_idx] ON [dbo].[ControlReportStatusHistory]([to_status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReportChecklistItem_control_report_id_sequence_no_idx] ON [dbo].[ControlReportChecklistItem]([control_report_id], [sequence_no]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReportChecklistItem_tenant_id_result_idx] ON [dbo].[ControlReportChecklistItem]([tenant_id], [result]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReportChecklistItem_item_code_idx] ON [dbo].[ControlReportChecklistItem]([item_code]);

-- CreateIndex
ALTER TABLE [dbo].[Contract] ADD CONSTRAINT [Contract_tenant_id_reference_key] UNIQUE NONCLUSTERED ([tenant_id], [reference]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReport_priority_status_idx] ON [dbo].[ControlReport]([priority], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReport_due_date_idx] ON [dbo].[ControlReport]([due_date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReport_target_resolution_at_idx] ON [dbo].[ControlReport]([target_resolution_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReport_approval_workflow_status_idx] ON [dbo].[ControlReport]([approval_workflow_status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReport_assigned_to_id_status_idx] ON [dbo].[ControlReport]([assigned_to_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReport_is_archived_idx] ON [dbo].[ControlReport]([is_archived]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReportAction_tenant_id_is_archived_idx] ON [dbo].[ControlReportAction]([tenant_id], [is_archived]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReportAttachment_tenant_id_is_archived_idx] ON [dbo].[ControlReportAttachment]([tenant_id], [is_archived]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReportAttachment_is_primary_evidence_idx] ON [dbo].[ControlReportAttachment]([is_primary_evidence]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReportAttachment_tenant_id_external_system_external_id_idx] ON [dbo].[ControlReportAttachment]([tenant_id], [external_system], [external_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ProjectLot_project_id_schedule_status_idx] ON [dbo].[ProjectLot]([project_id], [schedule_status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_tenant_id_schedule_status_idx] ON [dbo].[Task]([tenant_id], [schedule_status]);

-- AddForeignKey
ALTER TABLE [dbo].[ExecutionNote] ADD CONSTRAINT [ExecutionNote_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ExecutionNote] ADD CONSTRAINT [ExecutionNote_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ExecutionNote] ADD CONSTRAINT [ExecutionNote_lot_id_fkey] FOREIGN KEY ([lot_id]) REFERENCES [dbo].[ProjectLot]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ExecutionNote] ADD CONSTRAINT [ExecutionNote_task_id_fkey] FOREIGN KEY ([task_id]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ExecutionNote] ADD CONSTRAINT [ExecutionNote_incident_id_fkey] FOREIGN KEY ([incident_id]) REFERENCES [dbo].[Incident]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ExecutionNote] ADD CONSTRAINT [ExecutionNote_parent_id_fkey] FOREIGN KEY ([parent_id]) REFERENCES [dbo].[ExecutionNote]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ExecutionNote] ADD CONSTRAINT [ExecutionNote_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TaskStatusHistory] ADD CONSTRAINT [TaskStatusHistory_task_id_fkey] FOREIGN KEY ([task_id]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TaskStatusHistory] ADD CONSTRAINT [TaskStatusHistory_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LotStatusHistory] ADD CONSTRAINT [LotStatusHistory_lot_id_fkey] FOREIGN KEY ([lot_id]) REFERENCES [dbo].[ProjectLot]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LotStatusHistory] ADD CONSTRAINT [LotStatusHistory_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[IncidentStatusHistory] ADD CONSTRAINT [IncidentStatusHistory_incident_id_fkey] FOREIGN KEY ([incident_id]) REFERENCES [dbo].[Incident]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[IncidentStatusHistory] ADD CONSTRAINT [IncidentStatusHistory_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ControlReportStatusHistory] ADD CONSTRAINT [ControlReportStatusHistory_control_report_id_fkey] FOREIGN KEY ([control_report_id]) REFERENCES [dbo].[ControlReport]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ControlReportStatusHistory] ADD CONSTRAINT [ControlReportStatusHistory_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ControlReportChecklistItem] ADD CONSTRAINT [ControlReportChecklistItem_control_report_id_fkey] FOREIGN KEY ([control_report_id]) REFERENCES [dbo].[ControlReport]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ControlReportChecklistItem] ADD CONSTRAINT [ControlReportChecklistItem_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
