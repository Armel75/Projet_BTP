/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,reference]` on the table `ControlReport` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `reference` to the `ControlReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `ControlReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `DocumentVersion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `MeetingAttendee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Tender` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[ContractLineItem] DROP CONSTRAINT [ContractLineItem_updated_at_df];

-- AlterTable
ALTER TABLE [dbo].[ControlReport] ADD CONSTRAINT [ControlReport_status_df] DEFAULT 'DRAFT' FOR [status];
ALTER TABLE [dbo].[ControlReport] ADD [approved_at] DATETIME2,
[approved_by] INT,
[created_at] DATETIME2 NOT NULL CONSTRAINT [ControlReport_created_at_df] DEFAULT CURRENT_TIMESTAMP,
[discipline] NVARCHAR(1000),
[due_date] DATETIME2,
[location] NVARCHAR(1000),
[reference] NVARCHAR(1000) NOT NULL,
[rejected_reason] NVARCHAR(max),
[resolved_at] DATETIME2,
[severity] NVARCHAR(1000) NOT NULL CONSTRAINT [ControlReport_severity_df] DEFAULT 'MEDIUM',
[updated_at] DATETIME2 NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[Document] ADD [approval_status] NVARCHAR(1000) CONSTRAINT [Document_approval_status_df] DEFAULT 'DRAFT',
[confidentiality] NVARCHAR(1000) NOT NULL CONSTRAINT [Document_confidentiality_df] DEFAULT 'INTERNAL',
[discipline] NVARCHAR(1000) NOT NULL CONSTRAINT [Document_discipline_df] DEFAULT 'GENERAL',
[document_change_log] NVARCHAR(max),
[expiry_date] DATETIME2,
[file_name] NVARCHAR(1000),
[file_size] INT,
[file_type] NVARCHAR(1000),
[file_url] NVARCHAR(1000),
[phase] NVARCHAR(1000) NOT NULL CONSTRAINT [Document_phase_df] DEFAULT 'EXE',
[reference] NVARCHAR(1000),
[revision] NVARCHAR(1000) NOT NULL CONSTRAINT [Document_revision_df] DEFAULT 'A',
[security_clearance_level] NVARCHAR(1000) CONSTRAINT [Document_security_clearance_level_df] DEFAULT 'INTERNAL',
[status] NVARCHAR(1000) NOT NULL CONSTRAINT [Document_status_df] DEFAULT 'DRAFT',
[supersedes_document_id] INT;

-- AlterTable
ALTER TABLE [dbo].[DocumentVersion] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [DocumentVersion_created_at_df] DEFAULT CURRENT_TIMESTAMP,
[file_name] NVARCHAR(1000),
[file_type] NVARCHAR(1000),
[is_current] BIT NOT NULL CONSTRAINT [DocumentVersion_is_current_df] DEFAULT 0,
[revision] NVARCHAR(1000),
[status] NVARCHAR(1000) NOT NULL CONSTRAINT [DocumentVersion_status_df] DEFAULT 'DRAFT',
[updated_at] DATETIME2 NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[GoodsReceipt] ADD [external_id] NVARCHAR(1000),
[external_system] NVARCHAR(1000),
[last_synced_at] DATETIME2,
[location_id] INT,
[number] NVARCHAR(1000),
[source_updated_at] DATETIME2,
[status] NVARCHAR(1000) NOT NULL CONSTRAINT [GoodsReceipt_status_df] DEFAULT 'DRAFT',
[warehouse_id] INT;

-- AlterTable
ALTER TABLE [dbo].[GoodsReceiptItem] ADD [line_no] INT,
[total_cost] FLOAT(53),
[unit_cost] FLOAT(53);

-- AlterTable
ALTER TABLE [dbo].[Inspection] ADD [approval_workflow_status] NVARCHAR(1000),
[checklist_template_id] INT,
[date_scheduled] DATETIME2,
[evidence_photos_required] BIT NOT NULL CONSTRAINT [Inspection_evidence_photos_required_df] DEFAULT 0,
[inspection_result] NVARCHAR(1000),
[rework_required] BIT NOT NULL CONSTRAINT [Inspection_rework_required_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[InventoryItem] ADD [costing_method] NVARCHAR(1000) NOT NULL CONSTRAINT [InventoryItem_costing_method_df] DEFAULT 'CMUP',
[external_id] NVARCHAR(1000),
[external_system] NVARCHAR(1000),
[last_synced_at] DATETIME2,
[source_updated_at] DATETIME2,
[sync_status] NVARCHAR(1000) NOT NULL CONSTRAINT [InventoryItem_sync_status_df] DEFAULT 'LOCAL';

-- AlterTable
ALTER TABLE [dbo].[Invoice] ADD [dispute_reason] NVARCHAR(max),
[export_format_url] NVARCHAR(1000),
[invoice_line_items] NVARCHAR(max),
[invoice_status_code] NVARCHAR(1000),
[payment_status] NVARCHAR(1000),
[payment_tracking_status] NVARCHAR(1000),
[supplier_invoice_number] NVARCHAR(1000),
[tax_amount] FLOAT(53) CONSTRAINT [Invoice_tax_amount_df] DEFAULT 0,
[tax_rate] FLOAT(53) CONSTRAINT [Invoice_tax_rate_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[Meeting] ALTER COLUMN [minutes] NVARCHAR(max) NULL;
ALTER TABLE [dbo].[Meeting] ADD [agenda] NVARCHAR(max),
[conclusion] NVARCHAR(max),
[distribution_list] NVARCHAR(1000),
[end_date] DATETIME2,
[lot_id] INT,
[next_meeting_date] DATETIME2,
[next_meeting_location] NVARCHAR(1000),
[reference] NVARCHAR(1000),
[status] NVARCHAR(1000) NOT NULL CONSTRAINT [Meeting_status_df] DEFAULT 'PLANNED',
[type] NVARCHAR(1000) NOT NULL CONSTRAINT [Meeting_type_df] DEFAULT 'CHANTIER';

-- AlterTable
ALTER TABLE [dbo].[MeetingAttendee] ADD [company] NVARCHAR(1000),
[role_title] NVARCHAR(1000),
[status] NVARCHAR(1000) NOT NULL CONSTRAINT [MeetingAttendee_status_df] DEFAULT 'INVITED',
[updated_at] DATETIME2 NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[Payment] ADD [updated_at] DATETIME2 NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[Project] ADD [budget_approved] FLOAT(53),
[budget_committed] FLOAT(53),
[budget_spent] FLOAT(53) CONSTRAINT [Project_budget_spent_df] DEFAULT 0,
[building_type] NVARCHAR(1000),
[city] NVARCHAR(1000),
[client_contact_name] NVARCHAR(1000),
[client_phone] NVARCHAR(1000),
[contingency_budget] FLOAT(53),
[control_bureau] NVARCHAR(1000),
[country] NVARCHAR(1000) CONSTRAINT [Project_country_df] DEFAULT 'FR',
[erp_project_id] NVARCHAR(1000),
[hse_responsible_id] INT,
[is_archived] BIT NOT NULL CONSTRAINT [Project_is_archived_df] DEFAULT 0,
[latitude] FLOAT(53),
[longitude] FLOAT(53),
[moe_firm_name] NVARCHAR(1000),
[permit_number] NVARCHAR(1000),
[permit_type] NVARCHAR(1000),
[postal_code] NVARCHAR(1000),
[risk_classification] NVARCHAR(1000),
[street_address] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[PurchaseOrder] ADD [external_id] NVARCHAR(1000),
[external_system] NVARCHAR(1000),
[is_external] BIT NOT NULL CONSTRAINT [PurchaseOrder_is_external_df] DEFAULT 0,
[last_synced_at] DATETIME2,
[source_updated_at] DATETIME2,
[sync_status] NVARCHAR(1000) NOT NULL CONSTRAINT [PurchaseOrder_sync_status_df] DEFAULT 'LOCAL';

-- AlterTable
ALTER TABLE [dbo].[RFI] ADD CONSTRAINT [RFI_status_df] DEFAULT 'OPEN' FOR [status];
ALTER TABLE [dbo].[RFI] ADD [answered_date] DATETIME2,
[category] NVARCHAR(1000) NOT NULL CONSTRAINT [RFI_category_df] DEFAULT 'CLARIFICATION',
[closed_date] DATETIME2,
[cost_impact] BIT NOT NULL CONSTRAINT [RFI_cost_impact_df] DEFAULT 0,
[cost_impact_amount] FLOAT(53),
[discipline] NVARCHAR(1000),
[distribution_list] NVARCHAR(1000),
[drawing_ref] NVARCHAR(1000),
[due_date] DATETIME2,
[lot_id] INT,
[official_response] NVARCHAR(max),
[priority] NVARCHAR(1000) NOT NULL CONSTRAINT [RFI_priority_df] DEFAULT 'NORMAL',
[reference] NVARCHAR(1000),
[reviewed_by] INT,
[schedule_impact] BIT NOT NULL CONSTRAINT [RFI_schedule_impact_df] DEFAULT 0,
[schedule_impact_days] INT,
[spec_section] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[StockMovement] ADD [balance_after] FLOAT(53),
[cost_method] NVARCHAR(1000),
[location_id] INT,
[total_cost] FLOAT(53),
[unit_cost] FLOAT(53),
[warehouse_id] INT;

-- AlterTable
ALTER TABLE [dbo].[Supplier] ADD [external_id] NVARCHAR(1000),
[external_system] NVARCHAR(1000),
[last_synced_at] DATETIME2,
[source_updated_at] DATETIME2,
[sync_status] NVARCHAR(1000) NOT NULL CONSTRAINT [Supplier_sync_status_df] DEFAULT 'LOCAL';

-- AlterTable
ALTER TABLE [dbo].[Tender] ADD CONSTRAINT [Tender_status_df] DEFAULT 'DRAFT' FOR [status];
ALTER TABLE [dbo].[Tender] ADD [award_date] DATETIME2,
[awarded_supplier_id] INT,
[category] NVARCHAR(1000) NOT NULL CONSTRAINT [Tender_category_df] DEFAULT 'TRAVAUX',
[created_at] DATETIME2 NOT NULL CONSTRAINT [Tender_created_at_df] DEFAULT CURRENT_TIMESTAMP,
[currency] NVARCHAR(1000) NOT NULL CONSTRAINT [Tender_currency_df] DEFAULT 'EUR',
[document_url] NVARCHAR(1000),
[notes] NVARCHAR(max),
[reference] NVARCHAR(1000),
[updated_at] DATETIME2 NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[TenderBid] ADD [document_url] NVARCHAR(1000),
[financial_score] FLOAT(53),
[is_compliant] BIT NOT NULL CONSTRAINT [TenderBid_is_compliant_df] DEFAULT 1,
[notes] NVARCHAR(max),
[rank] INT,
[status] NVARCHAR(1000) NOT NULL CONSTRAINT [TenderBid_status_df] DEFAULT 'SUBMITTED',
[submitted_at] DATETIME2,
[technical_score] FLOAT(53),
[total_score] FLOAT(53),
[validity_period] INT;

-- AlterTable
ALTER TABLE [dbo].[User] ADD [account_status] NVARCHAR(1000),
[cost_center] NVARCHAR(1000),
[department] NVARCHAR(1000),
[email_verified] BIT NOT NULL CONSTRAINT [User_email_verified_df] DEFAULT 0,
[hire_date] DATETIME2,
[language_preference] NVARCHAR(1000) CONSTRAINT [User_language_preference_df] DEFAULT 'FR',
[mfa_enabled] BIT NOT NULL CONSTRAINT [User_mfa_enabled_df] DEFAULT 0,
[mfa_secret] NVARCHAR(1000),
[password_reset_expires] DATETIME2,
[password_reset_token] NVARCHAR(1000),
[termination_date] DATETIME2,
[timezone] NVARCHAR(1000) CONSTRAINT [User_timezone_df] DEFAULT 'Europe/Paris';

-- CreateTable
CREATE TABLE [dbo].[PurchaseOrderLine] (
    [id] INT NOT NULL IDENTITY(1,1),
    [order_id] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [line_no] INT NOT NULL,
    [item_id] INT,
    [item_code] NVARCHAR(1000),
    [description] NVARCHAR(max),
    [unit] NVARCHAR(1000),
    [quantity] FLOAT(53) NOT NULL CONSTRAINT [PurchaseOrderLine_quantity_df] DEFAULT 0,
    [unit_price] FLOAT(53) NOT NULL CONSTRAINT [PurchaseOrderLine_unit_price_df] DEFAULT 0,
    [total_price] FLOAT(53) NOT NULL CONSTRAINT [PurchaseOrderLine_total_price_df] DEFAULT 0,
    [quantity_received] FLOAT(53) NOT NULL CONSTRAINT [PurchaseOrderLine_quantity_received_df] DEFAULT 0,
    [quantity_remaining] FLOAT(53) NOT NULL CONSTRAINT [PurchaseOrderLine_quantity_remaining_df] DEFAULT 0,
    [delivery_date] DATETIME2,
    [external_system] NVARCHAR(1000),
    [external_id] NVARCHAR(1000),
    [source_updated_at] DATETIME2,
    [last_synced_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [PurchaseOrderLine_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [PurchaseOrderLine_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PurchaseOrderLine_order_id_line_no_key] UNIQUE NONCLUSTERED ([order_id],[line_no])
);

-- CreateTable
CREATE TABLE [dbo].[Warehouse] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenant_id] INT NOT NULL,
    [project_id] INT,
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [is_active] BIT NOT NULL CONSTRAINT [Warehouse_is_active_df] DEFAULT 1,
    [external_system] NVARCHAR(1000),
    [external_id] NVARCHAR(1000),
    [source_updated_at] DATETIME2,
    [last_synced_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Warehouse_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [Warehouse_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Warehouse_tenant_id_code_key] UNIQUE NONCLUSTERED ([tenant_id],[code])
);

-- CreateTable
CREATE TABLE [dbo].[WarehouseLocation] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenant_id] INT NOT NULL,
    [warehouse_id] INT NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [parent_id] INT,
    [is_active] BIT NOT NULL CONSTRAINT [WarehouseLocation_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [WarehouseLocation_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [WarehouseLocation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [WarehouseLocation_warehouse_id_code_key] UNIQUE NONCLUSTERED ([warehouse_id],[code])
);

-- CreateTable
CREATE TABLE [dbo].[InventoryBalance] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenant_id] INT NOT NULL,
    [project_id] INT NOT NULL,
    [warehouse_id] INT NOT NULL,
    [location_id] INT NOT NULL,
    [item_id] INT NOT NULL,
    [qty_on_hand] FLOAT(53) NOT NULL CONSTRAINT [InventoryBalance_qty_on_hand_df] DEFAULT 0,
    [qty_reserved] FLOAT(53) NOT NULL CONSTRAINT [InventoryBalance_qty_reserved_df] DEFAULT 0,
    [qty_available] FLOAT(53) NOT NULL CONSTRAINT [InventoryBalance_qty_available_df] DEFAULT 0,
    [qty_in_transit] FLOAT(53) NOT NULL CONSTRAINT [InventoryBalance_qty_in_transit_df] DEFAULT 0,
    [last_unit_cost] FLOAT(53) NOT NULL CONSTRAINT [InventoryBalance_last_unit_cost_df] DEFAULT 0,
    [average_unit_cost] FLOAT(53) NOT NULL CONSTRAINT [InventoryBalance_average_unit_cost_df] DEFAULT 0,
    [total_stock_value] FLOAT(53) NOT NULL CONSTRAINT [InventoryBalance_total_stock_value_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [InventoryBalance_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [InventoryBalance_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [InventoryBalance_tenant_id_project_id_warehouse_id_location_id_item_id_key] UNIQUE NONCLUSTERED ([tenant_id],[project_id],[warehouse_id],[location_id],[item_id])
);

-- CreateTable
CREATE TABLE [dbo].[InventoryValuationLayer] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenant_id] INT NOT NULL,
    [project_id] INT NOT NULL,
    [warehouse_id] INT NOT NULL,
    [location_id] INT NOT NULL,
    [item_id] INT NOT NULL,
    [source_type] NVARCHAR(1000) NOT NULL,
    [source_id] NVARCHAR(1000) NOT NULL,
    [received_qty] FLOAT(53) NOT NULL,
    [remaining_qty] FLOAT(53) NOT NULL,
    [unit_cost] FLOAT(53) NOT NULL,
    [received_at] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [InventoryValuationLayer_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [InventoryValuationLayer_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[InventoryCostSnapshot] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenant_id] INT NOT NULL,
    [project_id] INT NOT NULL,
    [warehouse_id] INT NOT NULL,
    [location_id] INT NOT NULL,
    [item_id] INT NOT NULL,
    [cost_method] NVARCHAR(1000) NOT NULL,
    [current_unit_cost] FLOAT(53) NOT NULL CONSTRAINT [InventoryCostSnapshot_current_unit_cost_df] DEFAULT 0,
    [total_qty] FLOAT(53) NOT NULL CONSTRAINT [InventoryCostSnapshot_total_qty_df] DEFAULT 0,
    [stock_value] FLOAT(53) NOT NULL CONSTRAINT [InventoryCostSnapshot_stock_value_df] DEFAULT 0,
    [calculated_at] DATETIME2 NOT NULL CONSTRAINT [InventoryCostSnapshot_calculated_at_df] DEFAULT CURRENT_TIMESTAMP,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [InventoryCostSnapshot_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [InventoryCostSnapshot_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [InventoryCostSnapshot_tenant_id_project_id_warehouse_id_location_id_item_id_cost_method_key] UNIQUE NONCLUSTERED ([tenant_id],[project_id],[warehouse_id],[location_id],[item_id],[cost_method])
);

-- CreateTable
CREATE TABLE [dbo].[X3SyncState] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenant_id] INT NOT NULL,
    [entity_name] NVARCHAR(1000) NOT NULL,
    [last_success_at] DATETIME2,
    [last_source_updated_at] DATETIME2,
    [last_source_cursor] NVARCHAR(1000),
    [sync_mode] NVARCHAR(1000) NOT NULL CONSTRAINT [X3SyncState_sync_mode_df] DEFAULT 'INCREMENTAL',
    [last_error] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [X3SyncState_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [X3SyncState_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [X3SyncState_tenant_id_entity_name_key] UNIQUE NONCLUSTERED ([tenant_id],[entity_name])
);

-- CreateTable
CREATE TABLE [dbo].[X3SyncJob] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenant_id] INT NOT NULL,
    [entity_name] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [X3SyncJob_status_df] DEFAULT 'RUNNING',
    [started_at] DATETIME2 NOT NULL CONSTRAINT [X3SyncJob_started_at_df] DEFAULT CURRENT_TIMESTAMP,
    [ended_at] DATETIME2,
    [rows_read] INT NOT NULL CONSTRAINT [X3SyncJob_rows_read_df] DEFAULT 0,
    [rows_upserted] INT NOT NULL CONSTRAINT [X3SyncJob_rows_upserted_df] DEFAULT 0,
    [rows_failed] INT NOT NULL CONSTRAINT [X3SyncJob_rows_failed_df] DEFAULT 0,
    [message] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [X3SyncJob_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [X3SyncJob_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RFIComment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [rfi_id] INT NOT NULL,
    [user_id] INT,
    [content] NVARCHAR(max) NOT NULL,
    [document_url] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [RFIComment_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [RFIComment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SituationTravaux] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenant_id] INT NOT NULL,
    [project_id] INT NOT NULL,
    [contract_id] INT,
    [purchase_order_id] INT,
    [supplier_id] INT,
    [reference] NVARCHAR(1000),
    [period_start] DATETIME2 NOT NULL,
    [period_end] DATETIME2 NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [SituationTravaux_status_df] DEFAULT 'DRAFT',
    [source_system] NVARCHAR(1000) NOT NULL CONSTRAINT [SituationTravaux_source_system_df] DEFAULT 'LOCAL',
    [sync_status] NVARCHAR(1000) NOT NULL CONSTRAINT [SituationTravaux_sync_status_df] DEFAULT 'LOCAL',
    [external_system] NVARCHAR(1000),
    [external_id] NVARCHAR(1000),
    [source_updated_at] DATETIME2,
    [last_synced_at] DATETIME2,
    [reception_pct] FLOAT(53) NOT NULL CONSTRAINT [SituationTravaux_reception_pct_df] DEFAULT 0,
    [amount_global] DECIMAL(15,2) NOT NULL CONSTRAINT [SituationTravaux_amount_global_df] DEFAULT 0,
    [amount_proposed] DECIMAL(15,2) NOT NULL CONSTRAINT [SituationTravaux_amount_proposed_df] DEFAULT 0,
    [amount_accorded] DECIMAL(15,2) NOT NULL CONSTRAINT [SituationTravaux_amount_accorded_df] DEFAULT 0,
    [cumul_paid_before] DECIMAL(15,2) NOT NULL CONSTRAINT [SituationTravaux_cumul_paid_before_df] DEFAULT 0,
    [amount_paid_current] DECIMAL(15,2) NOT NULL CONSTRAINT [SituationTravaux_amount_paid_current_df] DEFAULT 0,
    [balance_to_pay] DECIMAL(15,2) NOT NULL CONSTRAINT [SituationTravaux_balance_to_pay_df] DEFAULT 0,
    [remaining_to_receive] DECIMAL(15,2) NOT NULL CONSTRAINT [SituationTravaux_remaining_to_receive_df] DEFAULT 0,
    [notes] NVARCHAR(max),
    [approved_at] DATETIME2,
    [created_by] INT,
    [approved_by] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [SituationTravaux_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [SituationTravaux_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ControlReportAction] (
    [id] INT NOT NULL IDENTITY(1,1),
    [control_report_id] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [subject] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
    [responsible_id] INT,
    [due_date] DATETIME2,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [ControlReportAction_status_df] DEFAULT 'OPEN',
    [completed_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ControlReportAction_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [ControlReportAction_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ControlReportAttachment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [control_report_id] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [url] NVARCHAR(1000) NOT NULL,
    [file_name] NVARCHAR(1000),
    [file_type] NVARCHAR(1000),
    [source] NVARCHAR(1000) NOT NULL CONSTRAINT [ControlReportAttachment_source_df] DEFAULT 'DOCUMENT',
    [caption] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ControlReportAttachment_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [ControlReportAttachment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MeetingActionItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [meeting_id] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [subject] NVARCHAR(1000) NOT NULL,
    [responsible_id] INT,
    [due_date] DATETIME2,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [MeetingActionItem_status_df] DEFAULT 'OPEN',
    [comment] NVARCHAR(max),
    [created_by] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [MeetingActionItem_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [MeetingActionItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PurchaseOrderLine_tenant_id_order_id_idx] ON [dbo].[PurchaseOrderLine]([tenant_id], [order_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PurchaseOrderLine_tenant_id_item_id_idx] ON [dbo].[PurchaseOrderLine]([tenant_id], [item_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PurchaseOrderLine_tenant_id_external_system_external_id_idx] ON [dbo].[PurchaseOrderLine]([tenant_id], [external_system], [external_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Warehouse_tenant_id_project_id_idx] ON [dbo].[Warehouse]([tenant_id], [project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Warehouse_tenant_id_external_system_external_id_idx] ON [dbo].[Warehouse]([tenant_id], [external_system], [external_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WarehouseLocation_tenant_id_warehouse_id_idx] ON [dbo].[WarehouseLocation]([tenant_id], [warehouse_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InventoryBalance_tenant_id_project_id_item_id_idx] ON [dbo].[InventoryBalance]([tenant_id], [project_id], [item_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InventoryBalance_tenant_id_warehouse_id_location_id_idx] ON [dbo].[InventoryBalance]([tenant_id], [warehouse_id], [location_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InventoryValuationLayer_tenant_id_project_id_item_id_received_at_idx] ON [dbo].[InventoryValuationLayer]([tenant_id], [project_id], [item_id], [received_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InventoryValuationLayer_tenant_id_warehouse_id_location_id_item_id_idx] ON [dbo].[InventoryValuationLayer]([tenant_id], [warehouse_id], [location_id], [item_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InventoryCostSnapshot_tenant_id_project_id_item_id_idx] ON [dbo].[InventoryCostSnapshot]([tenant_id], [project_id], [item_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InventoryCostSnapshot_tenant_id_warehouse_id_location_id_idx] ON [dbo].[InventoryCostSnapshot]([tenant_id], [warehouse_id], [location_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [X3SyncJob_tenant_id_entity_name_started_at_idx] ON [dbo].[X3SyncJob]([tenant_id], [entity_name], [started_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [X3SyncJob_tenant_id_status_idx] ON [dbo].[X3SyncJob]([tenant_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RFIComment_rfi_id_idx] ON [dbo].[RFIComment]([rfi_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SituationTravaux_tenant_id_project_id_idx] ON [dbo].[SituationTravaux]([tenant_id], [project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SituationTravaux_tenant_id_status_idx] ON [dbo].[SituationTravaux]([tenant_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SituationTravaux_project_id_period_start_period_end_idx] ON [dbo].[SituationTravaux]([project_id], [period_start], [period_end]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SituationTravaux_contract_id_idx] ON [dbo].[SituationTravaux]([contract_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SituationTravaux_purchase_order_id_idx] ON [dbo].[SituationTravaux]([purchase_order_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SituationTravaux_supplier_id_idx] ON [dbo].[SituationTravaux]([supplier_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SituationTravaux_tenant_id_external_system_external_id_idx] ON [dbo].[SituationTravaux]([tenant_id], [external_system], [external_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReportAction_control_report_id_idx] ON [dbo].[ControlReportAction]([control_report_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReportAction_tenant_id_status_idx] ON [dbo].[ControlReportAction]([tenant_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReportAction_responsible_id_status_idx] ON [dbo].[ControlReportAction]([responsible_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReportAction_due_date_idx] ON [dbo].[ControlReportAction]([due_date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReportAttachment_control_report_id_idx] ON [dbo].[ControlReportAttachment]([control_report_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReportAttachment_tenant_id_source_idx] ON [dbo].[ControlReportAttachment]([tenant_id], [source]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MeetingActionItem_meeting_id_idx] ON [dbo].[MeetingActionItem]([meeting_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MeetingActionItem_tenant_id_status_idx] ON [dbo].[MeetingActionItem]([tenant_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MeetingActionItem_responsible_id_status_idx] ON [dbo].[MeetingActionItem]([responsible_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReport_tenant_id_project_id_idx] ON [dbo].[ControlReport]([tenant_id], [project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReport_status_idx] ON [dbo].[ControlReport]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReport_severity_status_idx] ON [dbo].[ControlReport]([severity], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReport_report_date_idx] ON [dbo].[ControlReport]([report_date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ControlReport_approved_by_idx] ON [dbo].[ControlReport]([approved_by]);

-- CreateIndex
ALTER TABLE [dbo].[ControlReport] ADD CONSTRAINT [ControlReport_tenant_id_reference_key] UNIQUE NONCLUSTERED ([tenant_id], [reference]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Document_project_id_idx] ON [dbo].[Document]([project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Document_status_idx] ON [dbo].[Document]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Document_supersedes_document_id_idx] ON [dbo].[Document]([supersedes_document_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodsReceipt_tenant_id_external_system_external_id_idx] ON [dbo].[GoodsReceipt]([tenant_id], [external_system], [external_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Inspection_approval_workflow_status_idx] ON [dbo].[Inspection]([approval_workflow_status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InventoryItem_tenant_id_external_system_external_id_idx] ON [dbo].[InventoryItem]([tenant_id], [external_system], [external_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Invoice_payment_tracking_status_idx] ON [dbo].[Invoice]([payment_tracking_status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Meeting_project_id_idx] ON [dbo].[Meeting]([project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Meeting_project_id_status_idx] ON [dbo].[Meeting]([project_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Meeting_tenant_id_status_idx] ON [dbo].[Meeting]([tenant_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MeetingAttendee_meeting_id_idx] ON [dbo].[MeetingAttendee]([meeting_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PunchItem_tenant_id_project_id_idx] ON [dbo].[PunchItem]([tenant_id], [project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PurchaseOrder_tenant_id_external_system_external_id_idx] ON [dbo].[PurchaseOrder]([tenant_id], [external_system], [external_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RFI_priority_status_idx] ON [dbo].[RFI]([priority], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RFI_due_date_idx] ON [dbo].[RFI]([due_date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockMovement_warehouse_id_location_id_idx] ON [dbo].[StockMovement]([warehouse_id], [location_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Supplier_tenant_id_external_system_external_id_idx] ON [dbo].[Supplier]([tenant_id], [external_system], [external_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Tender_awarded_supplier_id_idx] ON [dbo].[Tender]([awarded_supplier_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TenderBid_tender_id_idx] ON [dbo].[TenderBid]([tender_id]);

-- AddForeignKey
ALTER TABLE [dbo].[Project] ADD CONSTRAINT [Project_hse_responsible_id_fkey] FOREIGN KEY ([hse_responsible_id]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Tender] ADD CONSTRAINT [Tender_awarded_supplier_id_fkey] FOREIGN KEY ([awarded_supplier_id]) REFERENCES [dbo].[Supplier]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseOrderLine] ADD CONSTRAINT [PurchaseOrderLine_order_id_fkey] FOREIGN KEY ([order_id]) REFERENCES [dbo].[PurchaseOrder]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseOrderLine] ADD CONSTRAINT [PurchaseOrderLine_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseOrderLine] ADD CONSTRAINT [PurchaseOrderLine_item_id_fkey] FOREIGN KEY ([item_id]) REFERENCES [dbo].[InventoryItem]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Warehouse] ADD CONSTRAINT [Warehouse_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Warehouse] ADD CONSTRAINT [Warehouse_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WarehouseLocation] ADD CONSTRAINT [WarehouseLocation_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WarehouseLocation] ADD CONSTRAINT [WarehouseLocation_warehouse_id_fkey] FOREIGN KEY ([warehouse_id]) REFERENCES [dbo].[Warehouse]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WarehouseLocation] ADD CONSTRAINT [WarehouseLocation_parent_id_fkey] FOREIGN KEY ([parent_id]) REFERENCES [dbo].[WarehouseLocation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InventoryBalance] ADD CONSTRAINT [InventoryBalance_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InventoryBalance] ADD CONSTRAINT [InventoryBalance_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InventoryBalance] ADD CONSTRAINT [InventoryBalance_warehouse_id_fkey] FOREIGN KEY ([warehouse_id]) REFERENCES [dbo].[Warehouse]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InventoryBalance] ADD CONSTRAINT [InventoryBalance_location_id_fkey] FOREIGN KEY ([location_id]) REFERENCES [dbo].[WarehouseLocation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InventoryBalance] ADD CONSTRAINT [InventoryBalance_item_id_fkey] FOREIGN KEY ([item_id]) REFERENCES [dbo].[InventoryItem]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InventoryValuationLayer] ADD CONSTRAINT [InventoryValuationLayer_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InventoryValuationLayer] ADD CONSTRAINT [InventoryValuationLayer_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InventoryValuationLayer] ADD CONSTRAINT [InventoryValuationLayer_warehouse_id_fkey] FOREIGN KEY ([warehouse_id]) REFERENCES [dbo].[Warehouse]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InventoryValuationLayer] ADD CONSTRAINT [InventoryValuationLayer_location_id_fkey] FOREIGN KEY ([location_id]) REFERENCES [dbo].[WarehouseLocation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InventoryValuationLayer] ADD CONSTRAINT [InventoryValuationLayer_item_id_fkey] FOREIGN KEY ([item_id]) REFERENCES [dbo].[InventoryItem]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InventoryCostSnapshot] ADD CONSTRAINT [InventoryCostSnapshot_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InventoryCostSnapshot] ADD CONSTRAINT [InventoryCostSnapshot_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InventoryCostSnapshot] ADD CONSTRAINT [InventoryCostSnapshot_warehouse_id_fkey] FOREIGN KEY ([warehouse_id]) REFERENCES [dbo].[Warehouse]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InventoryCostSnapshot] ADD CONSTRAINT [InventoryCostSnapshot_location_id_fkey] FOREIGN KEY ([location_id]) REFERENCES [dbo].[WarehouseLocation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InventoryCostSnapshot] ADD CONSTRAINT [InventoryCostSnapshot_item_id_fkey] FOREIGN KEY ([item_id]) REFERENCES [dbo].[InventoryItem]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GoodsReceipt] ADD CONSTRAINT [GoodsReceipt_warehouse_id_fkey] FOREIGN KEY ([warehouse_id]) REFERENCES [dbo].[Warehouse]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GoodsReceipt] ADD CONSTRAINT [GoodsReceipt_location_id_fkey] FOREIGN KEY ([location_id]) REFERENCES [dbo].[WarehouseLocation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockMovement] ADD CONSTRAINT [StockMovement_warehouse_id_fkey] FOREIGN KEY ([warehouse_id]) REFERENCES [dbo].[Warehouse]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockMovement] ADD CONSTRAINT [StockMovement_location_id_fkey] FOREIGN KEY ([location_id]) REFERENCES [dbo].[WarehouseLocation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[X3SyncState] ADD CONSTRAINT [X3SyncState_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[X3SyncJob] ADD CONSTRAINT [X3SyncJob_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RFI] ADD CONSTRAINT [RFI_reviewed_by_fkey] FOREIGN KEY ([reviewed_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RFI] ADD CONSTRAINT [RFI_lot_id_fkey] FOREIGN KEY ([lot_id]) REFERENCES [dbo].[ProjectLot]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RFIComment] ADD CONSTRAINT [RFIComment_rfi_id_fkey] FOREIGN KEY ([rfi_id]) REFERENCES [dbo].[RFI]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RFIComment] ADD CONSTRAINT [RFIComment_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SituationTravaux] ADD CONSTRAINT [SituationTravaux_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SituationTravaux] ADD CONSTRAINT [SituationTravaux_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SituationTravaux] ADD CONSTRAINT [SituationTravaux_contract_id_fkey] FOREIGN KEY ([contract_id]) REFERENCES [dbo].[Contract]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SituationTravaux] ADD CONSTRAINT [SituationTravaux_purchase_order_id_fkey] FOREIGN KEY ([purchase_order_id]) REFERENCES [dbo].[PurchaseOrder]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SituationTravaux] ADD CONSTRAINT [SituationTravaux_supplier_id_fkey] FOREIGN KEY ([supplier_id]) REFERENCES [dbo].[Supplier]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SituationTravaux] ADD CONSTRAINT [SituationTravaux_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SituationTravaux] ADD CONSTRAINT [SituationTravaux_approved_by_fkey] FOREIGN KEY ([approved_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ControlReport] ADD CONSTRAINT [ControlReport_approved_by_fkey] FOREIGN KEY ([approved_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ControlReportAction] ADD CONSTRAINT [ControlReportAction_control_report_id_fkey] FOREIGN KEY ([control_report_id]) REFERENCES [dbo].[ControlReport]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ControlReportAction] ADD CONSTRAINT [ControlReportAction_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ControlReportAction] ADD CONSTRAINT [ControlReportAction_responsible_id_fkey] FOREIGN KEY ([responsible_id]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ControlReportAttachment] ADD CONSTRAINT [ControlReportAttachment_control_report_id_fkey] FOREIGN KEY ([control_report_id]) REFERENCES [dbo].[ControlReport]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ControlReportAttachment] ADD CONSTRAINT [ControlReportAttachment_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_supersedes_document_id_fkey] FOREIGN KEY ([supersedes_document_id]) REFERENCES [dbo].[Document]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Meeting] ADD CONSTRAINT [Meeting_lot_id_fkey] FOREIGN KEY ([lot_id]) REFERENCES [dbo].[ProjectLot]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MeetingActionItem] ADD CONSTRAINT [MeetingActionItem_meeting_id_fkey] FOREIGN KEY ([meeting_id]) REFERENCES [dbo].[Meeting]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MeetingActionItem] ADD CONSTRAINT [MeetingActionItem_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MeetingActionItem] ADD CONSTRAINT [MeetingActionItem_responsible_id_fkey] FOREIGN KEY ([responsible_id]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MeetingActionItem] ADD CONSTRAINT [MeetingActionItem_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
