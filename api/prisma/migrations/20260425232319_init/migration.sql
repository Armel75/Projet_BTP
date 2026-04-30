BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ResourceType] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ResourceType_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [ResourceType_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ResourceType_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Tenant] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Tenant_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [Tenant_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] INT NOT NULL IDENTITY(1,1),
    [firstname] NVARCHAR(1000) NOT NULL,
    [lastname] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [password_hash] NVARCHAR(1000) NOT NULL,
    [tenant_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [User_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Resource] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenant_id] INT NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [type_id] INT NOT NULL,
    [cost_rate] FLOAT(53) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Resource_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [Resource_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Project] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [tenant_id] INT NOT NULL,
    [created_by] INT NOT NULL,
    [document_id] INT NOT NULL,
    [start_date] DATETIME2,
    [end_date] DATETIME2,
    [budget_initial] FLOAT(53) NOT NULL,
    [currency] NVARCHAR(1000) NOT NULL,
    [location] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Project_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Project_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[ProjectLot] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
    [tenant_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ProjectLot_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [ProjectLot_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WBSNode] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [parent_id] INT,
    [tenant_id] INT NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [level] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [WBSNode_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [WBSNode_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Task] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [wbs_id] INT,
    [title] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [progress] FLOAT(53) NOT NULL,
    [tenant_id] INT NOT NULL,
    [planned_start] DATETIME2,
    [planned_end] DATETIME2,
    CONSTRAINT [Task_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TaskAssignment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [task_id] INT NOT NULL,
    [resource_id] INT NOT NULL,
    [planned_hours] FLOAT(53) NOT NULL,
    [actual_hours] FLOAT(53),
    [start_date] DATETIME2,
    [end_date] DATETIME2,
    [tenant_id] INT NOT NULL,
    CONSTRAINT [TaskAssignment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TaskDependency] (
    [id] INT NOT NULL IDENTITY(1,1),
    [task_id] INT NOT NULL,
    [depends_on_id] INT NOT NULL,
    CONSTRAINT [TaskDependency_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Supplier] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenant_id] INT NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Supplier_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [Supplier_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Tender] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [tenant_id] INT NOT NULL,
    CONSTRAINT [Tender_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TenderBid] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tender_id] INT NOT NULL,
    [supplier_id] INT NOT NULL,
    [amount] FLOAT(53) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [TenderBid_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [TenderBid_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PurchaseOrder] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [supplier_id] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [currency] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [PurchaseOrder_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [PurchaseOrder_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Delivery] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [tenant_id] INT NOT NULL,
    [delivered_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Delivery_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [Delivery_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[InventoryItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenant_id] INT NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [unit] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [InventoryItem_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [InventoryItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ProjectStock] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [item_id] INT NOT NULL,
    [document_id] INT,
    [quantity] FLOAT(53) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ProjectStock_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [ProjectStock_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ProjectStock_project_id_item_id_key] UNIQUE NONCLUSTERED ([project_id],[item_id])
);

-- CreateTable
CREATE TABLE [dbo].[GoodsReceipt] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [order_id] INT NOT NULL,
    [received_at] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [GoodsReceipt_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [GoodsReceipt_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[GoodsReceiptItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [receipt_id] INT NOT NULL,
    [item_id] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [document_id] INT,
    [quantity_ordered] FLOAT(53) NOT NULL,
    [quantity_received] FLOAT(53) NOT NULL,
    [quantity_rejected] FLOAT(53),
    [project_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [GoodsReceiptItem_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [GoodsReceiptItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[StockMovement] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [item_id] INT NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [quantity] FLOAT(53) NOT NULL,
    [document_id] INT,
    [source_type] NVARCHAR(1000) NOT NULL,
    [source_id] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [StockMovement_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [StockMovement_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MaterialConsumption] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [task_id] INT,
    [item_id] INT NOT NULL,
    [document_id] INT,
    [quantity] FLOAT(53) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [MaterialConsumption_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [MaterialConsumption_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Contract] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [supplier_id] INT NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [reference] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [executed_at] DATETIME2,
    [retention_pct] FLOAT(53),
    [currency] NVARCHAR(1000) NOT NULL,
    [tenant_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Contract_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [Contract_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ContractLineItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [contract_id] INT NOT NULL,
    [wbs_id] INT,
    [description] NVARCHAR(max) NOT NULL,
    [quantity] FLOAT(53) NOT NULL,
    [unit] NVARCHAR(1000) NOT NULL,
    [unit_price] FLOAT(53) NOT NULL,
    [total_price] FLOAT(53) NOT NULL,
    [tenant_id] INT NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [ContractLineItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ChangeOrder] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [contract_id] INT NOT NULL,
    [number] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [amount] FLOAT(53) NOT NULL,
    [approved_at] DATETIME2,
    [tenant_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ChangeOrder_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [ChangeOrder_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RFI] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [number] NVARCHAR(1000) NOT NULL,
    [subject] NVARCHAR(max) NOT NULL,
    [question] NVARCHAR(max) NOT NULL,
    [answer] NVARCHAR(max),
    [status] NVARCHAR(1000) NOT NULL,
    [submitted_by] INT,
    [assigned_to] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [RFI_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [RFI_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Submittal] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [specification_ref] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL,
    [due_date] DATETIME2,
    [submission_date] DATETIME2,
    [response_date] DATETIME2,
    [tenant_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Submittal_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [Submittal_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SubmittalItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [submittal_id] INT NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [document_url] NVARCHAR(1000),
    CONSTRAINT [SubmittalItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[BudgetLine] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [wbs_id] INT,
    [category] NVARCHAR(1000) NOT NULL,
    [planned] FLOAT(53) NOT NULL,
    [currency] NVARCHAR(1000) NOT NULL,
    [tenant_id] INT NOT NULL,
    [supplier_id] INT,
    [actual] FLOAT(53) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [BudgetLine_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [BudgetLine_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Invoice] (
    [id] INT NOT NULL IDENTITY(1,1),
    [contract_id] INT NOT NULL,
    [project_id] INT NOT NULL,
    [number] NVARCHAR(1000) NOT NULL,
    [amount] FLOAT(53) NOT NULL,
    [retention] FLOAT(53),
    [status] NVARCHAR(1000) NOT NULL,
    [due_date] DATETIME2,
    [tenant_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Invoice_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [Invoice_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Payment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [invoice_id] INT NOT NULL,
    [amount] FLOAT(53) NOT NULL,
    [date] DATETIME2 NOT NULL,
    [tenant_id] INT NOT NULL,
    [method] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Payment_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Payment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ControlReport] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [task_id] INT,
    [tenant_id] INT NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [comment] NVARCHAR(max) NOT NULL,
    CONSTRAINT [ControlReport_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkAcceptance] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [accepted_at] DATETIME2,
    CONSTRAINT [WorkAcceptance_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Incident] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [task_id] INT,
    [tenant_id] INT NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [severity] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Incident_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [resolved_at] DATETIME2,
    CONSTRAINT [Incident_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Document] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [category] NVARCHAR(1000) NOT NULL CONSTRAINT [Document_category_df] DEFAULT 'PLAN',
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
    [is_archived] BIT NOT NULL CONSTRAINT [Document_is_archived_df] DEFAULT 0,
    [tenant_id] INT NOT NULL,
    [tags] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Document_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [Document_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[DocumentVersion] (
    [id] INT NOT NULL IDENTITY(1,1),
    [document_id] INT NOT NULL,
    [version] INT NOT NULL,
    [file_url] NVARCHAR(1000) NOT NULL,
    [file_size] INT,
    [tenant_id] INT NOT NULL,
    [created_by] INT NOT NULL,
    [comment] NVARCHAR(max),
    CONSTRAINT [DocumentVersion_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Photo] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [file_url] NVARCHAR(1000) NOT NULL,
    [caption] NVARCHAR(max),
    [taken_at] DATETIME2 NOT NULL CONSTRAINT [Photo_taken_at_df] DEFAULT CURRENT_TIMESTAMP,
    [tagged_entities] NVARCHAR(max),
    [tenant_id] INT NOT NULL,
    [daily_log_id] INT,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Photo_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Photo_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[DocumentExchange] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [message] NVARCHAR(max) NOT NULL,
    [file_url] NVARCHAR(1000),
    [tenant_id] INT NOT NULL,
    CONSTRAINT [DocumentExchange_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkflowDefinition] (
    [created_at] DATETIME2 NOT NULL CONSTRAINT [WorkflowDefinition_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [tenant_id] INT NOT NULL,
    CONSTRAINT [WorkflowDefinition_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkflowStep] (
    [created_at] DATETIME2 NOT NULL CONSTRAINT [WorkflowStep_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [id] INT NOT NULL IDENTITY(1,1),
    [definition_id] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [order] INT NOT NULL,
    CONSTRAINT [WorkflowStep_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkflowTransition] (
    [created_at] DATETIME2 NOT NULL CONSTRAINT [WorkflowTransition_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [id] INT NOT NULL IDENTITY(1,1),
    [from_step_id] INT NOT NULL,
    [to_step_id] INT NOT NULL,
    [condition] NVARCHAR(1000),
    [tenant_id] INT NOT NULL,
    CONSTRAINT [WorkflowTransition_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkflowInstance] (
    [created_at] DATETIME2 NOT NULL CONSTRAINT [WorkflowInstance_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [id] INT NOT NULL IDENTITY(1,1),
    [definition_id] INT NOT NULL,
    [project_id] INT NOT NULL,
    [current_step_id] INT NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [tenant_id] INT NOT NULL,
    CONSTRAINT [WorkflowInstance_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkflowAction] (
    [id] INT NOT NULL IDENTITY(1,1),
    [instance_id] INT NOT NULL,
    [step_id] INT NOT NULL,
    [action] NVARCHAR(1000) NOT NULL,
    [comment] NVARCHAR(max),
    [performed_by] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [WorkflowAction_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WorkflowAction_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [id] INT NOT NULL IDENTITY(1,1),
    [user_id] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [action] NVARCHAR(1000) NOT NULL,
    [entity_type] NVARCHAR(1000) NOT NULL,
    [entity_id] NVARCHAR(1000) NOT NULL,
    [old_value] NVARCHAR(max),
    [new_value] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [AuditLog_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[DailyLog] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [date] DATETIME2 NOT NULL,
    [weather] NVARCHAR(1000),
    [temperature] FLOAT(53),
    [notes] NVARCHAR(max),
    [tenant_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [DailyLog_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [DailyLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[DailyLogLabor] (
    [id] INT NOT NULL IDENTITY(1,1),
    [daily_log_id] INT NOT NULL,
    [worker_name] NVARCHAR(1000),
    [hours] FLOAT(53) NOT NULL,
    [trade] NVARCHAR(1000),
    CONSTRAINT [DailyLogLabor_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[DailyLogEquipment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [daily_log_id] INT NOT NULL,
    [equipment_id] NVARCHAR(1000),
    [hours_used] FLOAT(53) NOT NULL,
    CONSTRAINT [DailyLogEquipment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[DailyLogMaterial] (
    [id] INT NOT NULL IDENTITY(1,1),
    [daily_log_id] INT NOT NULL,
    [material_id] NVARCHAR(1000),
    [quantity] FLOAT(53) NOT NULL,
    [unit] NVARCHAR(1000),
    CONSTRAINT [DailyLogMaterial_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Inspection] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [scheduled_date] DATETIME2,
    [completed_date] DATETIME2,
    [tenant_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Inspection_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [Inspection_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[InspectionItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [inspection_id] INT NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [result] NVARCHAR(1000),
    [comment] NVARCHAR(max),
    CONSTRAINT [InspectionItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PunchItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [assigned_to] NVARCHAR(1000),
    [due_date] DATETIME2,
    [resolved_at] DATETIME2,
    [tenant_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [PunchItem_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [PunchItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Meeting] (
    [id] INT NOT NULL IDENTITY(1,1),
    [project_id] INT NOT NULL,
    [tenant_id] INT NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [date] DATETIME2 NOT NULL,
    [location] NVARCHAR(1000),
    [minutes] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Meeting_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [Meeting_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MeetingAttendee] (
    [id] INT NOT NULL IDENTITY(1,1),
    [meeting_id] INT NOT NULL,
    [user_id] INT,
    [name] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [MeetingAttendee_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [MeetingAttendee_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[UserProjectRole] (
    [id] INT NOT NULL IDENTITY(1,1),
    [user_id] INT NOT NULL,
    [project_id] INT NOT NULL,
    [role] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [UserProjectRole_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserProjectRole_user_id_project_id_key] UNIQUE NONCLUSTERED ([user_id],[project_id])
);

-- CreateTable
CREATE TABLE [dbo].[CostType] (
    [created_at] DATETIME2 NOT NULL CONSTRAINT [CostType_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [code] NVARCHAR(1000) NOT NULL,
    [label] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [CostType_pkey] PRIMARY KEY CLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[CostTransaction] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tenant_id] INT NOT NULL,
    [project_id] INT NOT NULL,
    [wbs_id] INT,
    [type_code] NVARCHAR(1000) NOT NULL,
    [source_code] NVARCHAR(1000) NOT NULL,
    [category_code] NVARCHAR(1000),
    [reference_id] NVARCHAR(1000) NOT NULL,
    [amount] FLOAT(53) NOT NULL,
    [currency] NVARCHAR(1000) NOT NULL,
    [document_id] INT,
    [transaction_date] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [CostTransaction_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [CostTransaction_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[_BudgetLineToControlReport] (
    [A] INT NOT NULL,
    [B] INT NOT NULL,
    CONSTRAINT [_BudgetLineToControlReport_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateTable
CREATE TABLE [dbo].[_CostTransactionToProjectStock] (
    [A] INT NOT NULL,
    [B] INT NOT NULL,
    CONSTRAINT [_CostTransactionToProjectStock_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_tenant_id_idx] ON [dbo].[Task]([tenant_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_project_id_idx] ON [dbo].[Task]([project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_status_idx] ON [dbo].[Task]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskAssignment_task_id_idx] ON [dbo].[TaskAssignment]([task_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskAssignment_resource_id_idx] ON [dbo].[TaskAssignment]([resource_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TenderBid_supplier_id_idx] ON [dbo].[TenderBid]([supplier_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PurchaseOrder_supplier_id_idx] ON [dbo].[PurchaseOrder]([supplier_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PurchaseOrder_project_id_idx] ON [dbo].[PurchaseOrder]([project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodsReceipt_project_id_idx] ON [dbo].[GoodsReceipt]([project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodsReceiptItem_receipt_id_idx] ON [dbo].[GoodsReceiptItem]([receipt_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodsReceiptItem_item_id_idx] ON [dbo].[GoodsReceiptItem]([item_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockMovement_project_id_created_at_idx] ON [dbo].[StockMovement]([project_id], [created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MaterialConsumption_task_id_idx] ON [dbo].[MaterialConsumption]([task_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MaterialConsumption_project_id_item_id_idx] ON [dbo].[MaterialConsumption]([project_id], [item_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Incident_project_id_status_idx] ON [dbo].[Incident]([project_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DocumentVersion_document_id_idx] ON [dbo].[DocumentVersion]([document_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DocumentVersion_created_by_idx] ON [dbo].[DocumentVersion]([created_by]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkflowTransition_from_step_id_idx] ON [dbo].[WorkflowTransition]([from_step_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkflowTransition_to_step_id_idx] ON [dbo].[WorkflowTransition]([to_step_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkflowInstance_project_id_idx] ON [dbo].[WorkflowInstance]([project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkflowInstance_current_step_id_idx] ON [dbo].[WorkflowInstance]([current_step_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkflowInstance_definition_id_idx] ON [dbo].[WorkflowInstance]([definition_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkflowAction_performed_by_idx] ON [dbo].[WorkflowAction]([performed_by]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkflowAction_instance_id_idx] ON [dbo].[WorkflowAction]([instance_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkflowAction_step_id_idx] ON [dbo].[WorkflowAction]([step_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CostTransaction_project_id_idx] ON [dbo].[CostTransaction]([project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CostTransaction_wbs_id_idx] ON [dbo].[CostTransaction]([wbs_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CostTransaction_type_code_idx] ON [dbo].[CostTransaction]([type_code]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CostTransaction_tenant_id_idx] ON [dbo].[CostTransaction]([tenant_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CostTransaction_transaction_date_idx] ON [dbo].[CostTransaction]([transaction_date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_BudgetLineToControlReport_B_index] ON [dbo].[_BudgetLineToControlReport]([B]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_CostTransactionToProjectStock_B_index] ON [dbo].[_CostTransactionToProjectStock]([B]);

-- AddForeignKey
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Resource] ADD CONSTRAINT [Resource_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Resource] ADD CONSTRAINT [Resource_type_id_fkey] FOREIGN KEY ([type_id]) REFERENCES [dbo].[ResourceType]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Project] ADD CONSTRAINT [Project_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Project] ADD CONSTRAINT [Project_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Project] ADD CONSTRAINT [Project_document_id_fkey] FOREIGN KEY ([document_id]) REFERENCES [dbo].[Document]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProjectLot] ADD CONSTRAINT [ProjectLot_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProjectLot] ADD CONSTRAINT [ProjectLot_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WBSNode] ADD CONSTRAINT [WBSNode_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WBSNode] ADD CONSTRAINT [WBSNode_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WBSNode] ADD CONSTRAINT [WBSNode_parent_id_fkey] FOREIGN KEY ([parent_id]) REFERENCES [dbo].[WBSNode]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Task] ADD CONSTRAINT [Task_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Task] ADD CONSTRAINT [Task_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Task] ADD CONSTRAINT [Task_wbs_id_fkey] FOREIGN KEY ([wbs_id]) REFERENCES [dbo].[WBSNode]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TaskAssignment] ADD CONSTRAINT [TaskAssignment_task_id_fkey] FOREIGN KEY ([task_id]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TaskAssignment] ADD CONSTRAINT [TaskAssignment_resource_id_fkey] FOREIGN KEY ([resource_id]) REFERENCES [dbo].[Resource]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TaskAssignment] ADD CONSTRAINT [TaskAssignment_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TaskDependency] ADD CONSTRAINT [TaskDependency_task_id_fkey] FOREIGN KEY ([task_id]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TaskDependency] ADD CONSTRAINT [TaskDependency_depends_on_id_fkey] FOREIGN KEY ([depends_on_id]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Supplier] ADD CONSTRAINT [Supplier_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Tender] ADD CONSTRAINT [Tender_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Tender] ADD CONSTRAINT [Tender_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TenderBid] ADD CONSTRAINT [TenderBid_tender_id_fkey] FOREIGN KEY ([tender_id]) REFERENCES [dbo].[Tender]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TenderBid] ADD CONSTRAINT [TenderBid_supplier_id_fkey] FOREIGN KEY ([supplier_id]) REFERENCES [dbo].[Supplier]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseOrder] ADD CONSTRAINT [PurchaseOrder_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseOrder] ADD CONSTRAINT [PurchaseOrder_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseOrder] ADD CONSTRAINT [PurchaseOrder_supplier_id_fkey] FOREIGN KEY ([supplier_id]) REFERENCES [dbo].[Supplier]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Delivery] ADD CONSTRAINT [Delivery_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Delivery] ADD CONSTRAINT [Delivery_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InventoryItem] ADD CONSTRAINT [InventoryItem_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProjectStock] ADD CONSTRAINT [ProjectStock_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProjectStock] ADD CONSTRAINT [ProjectStock_item_id_fkey] FOREIGN KEY ([item_id]) REFERENCES [dbo].[InventoryItem]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProjectStock] ADD CONSTRAINT [ProjectStock_document_id_fkey] FOREIGN KEY ([document_id]) REFERENCES [dbo].[Document]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GoodsReceipt] ADD CONSTRAINT [GoodsReceipt_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GoodsReceipt] ADD CONSTRAINT [GoodsReceipt_order_id_fkey] FOREIGN KEY ([order_id]) REFERENCES [dbo].[PurchaseOrder]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GoodsReceiptItem] ADD CONSTRAINT [GoodsReceiptItem_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GoodsReceiptItem] ADD CONSTRAINT [GoodsReceiptItem_receipt_id_fkey] FOREIGN KEY ([receipt_id]) REFERENCES [dbo].[GoodsReceipt]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GoodsReceiptItem] ADD CONSTRAINT [GoodsReceiptItem_item_id_fkey] FOREIGN KEY ([item_id]) REFERENCES [dbo].[InventoryItem]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GoodsReceiptItem] ADD CONSTRAINT [GoodsReceiptItem_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GoodsReceiptItem] ADD CONSTRAINT [GoodsReceiptItem_document_id_fkey] FOREIGN KEY ([document_id]) REFERENCES [dbo].[Document]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockMovement] ADD CONSTRAINT [StockMovement_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockMovement] ADD CONSTRAINT [StockMovement_item_id_fkey] FOREIGN KEY ([item_id]) REFERENCES [dbo].[InventoryItem]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockMovement] ADD CONSTRAINT [StockMovement_document_id_fkey] FOREIGN KEY ([document_id]) REFERENCES [dbo].[Document]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MaterialConsumption] ADD CONSTRAINT [MaterialConsumption_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MaterialConsumption] ADD CONSTRAINT [MaterialConsumption_task_id_fkey] FOREIGN KEY ([task_id]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MaterialConsumption] ADD CONSTRAINT [MaterialConsumption_item_id_fkey] FOREIGN KEY ([item_id]) REFERENCES [dbo].[InventoryItem]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MaterialConsumption] ADD CONSTRAINT [MaterialConsumption_document_id_fkey] FOREIGN KEY ([document_id]) REFERENCES [dbo].[Document]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Contract] ADD CONSTRAINT [Contract_supplier_id_fkey] FOREIGN KEY ([supplier_id]) REFERENCES [dbo].[Supplier]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Contract] ADD CONSTRAINT [Contract_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Contract] ADD CONSTRAINT [Contract_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContractLineItem] ADD CONSTRAINT [ContractLineItem_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ContractLineItem] ADD CONSTRAINT [ContractLineItem_contract_id_fkey] FOREIGN KEY ([contract_id]) REFERENCES [dbo].[Contract]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ContractLineItem] ADD CONSTRAINT [ContractLineItem_wbs_id_fkey] FOREIGN KEY ([wbs_id]) REFERENCES [dbo].[WBSNode]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ChangeOrder] ADD CONSTRAINT [ChangeOrder_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ChangeOrder] ADD CONSTRAINT [ChangeOrder_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ChangeOrder] ADD CONSTRAINT [ChangeOrder_contract_id_fkey] FOREIGN KEY ([contract_id]) REFERENCES [dbo].[Contract]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RFI] ADD CONSTRAINT [RFI_submitted_by_fkey] FOREIGN KEY ([submitted_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RFI] ADD CONSTRAINT [RFI_assigned_to_fkey] FOREIGN KEY ([assigned_to]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RFI] ADD CONSTRAINT [RFI_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RFI] ADD CONSTRAINT [RFI_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Submittal] ADD CONSTRAINT [Submittal_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Submittal] ADD CONSTRAINT [Submittal_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SubmittalItem] ADD CONSTRAINT [SubmittalItem_submittal_id_fkey] FOREIGN KEY ([submittal_id]) REFERENCES [dbo].[Submittal]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[BudgetLine] ADD CONSTRAINT [BudgetLine_wbs_id_fkey] FOREIGN KEY ([wbs_id]) REFERENCES [dbo].[WBSNode]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BudgetLine] ADD CONSTRAINT [BudgetLine_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BudgetLine] ADD CONSTRAINT [BudgetLine_supplier_id_fkey] FOREIGN KEY ([supplier_id]) REFERENCES [dbo].[Supplier]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BudgetLine] ADD CONSTRAINT [BudgetLine_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Invoice] ADD CONSTRAINT [Invoice_contract_id_fkey] FOREIGN KEY ([contract_id]) REFERENCES [dbo].[Contract]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Invoice] ADD CONSTRAINT [Invoice_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Invoice] ADD CONSTRAINT [Invoice_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Payment] ADD CONSTRAINT [Payment_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Payment] ADD CONSTRAINT [Payment_invoice_id_fkey] FOREIGN KEY ([invoice_id]) REFERENCES [dbo].[Invoice]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ControlReport] ADD CONSTRAINT [ControlReport_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ControlReport] ADD CONSTRAINT [ControlReport_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ControlReport] ADD CONSTRAINT [ControlReport_task_id_fkey] FOREIGN KEY ([task_id]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkAcceptance] ADD CONSTRAINT [WorkAcceptance_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkAcceptance] ADD CONSTRAINT [WorkAcceptance_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Incident] ADD CONSTRAINT [Incident_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Incident] ADD CONSTRAINT [Incident_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Incident] ADD CONSTRAINT [Incident_task_id_fkey] FOREIGN KEY ([task_id]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Document] ADD CONSTRAINT [Document_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[DocumentVersion] ADD CONSTRAINT [DocumentVersion_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[DocumentVersion] ADD CONSTRAINT [DocumentVersion_document_id_fkey] FOREIGN KEY ([document_id]) REFERENCES [dbo].[Document]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[DocumentVersion] ADD CONSTRAINT [DocumentVersion_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Photo] ADD CONSTRAINT [Photo_daily_log_id_fkey] FOREIGN KEY ([daily_log_id]) REFERENCES [dbo].[DailyLog]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Photo] ADD CONSTRAINT [Photo_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Photo] ADD CONSTRAINT [Photo_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DocumentExchange] ADD CONSTRAINT [DocumentExchange_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DocumentExchange] ADD CONSTRAINT [DocumentExchange_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkflowDefinition] ADD CONSTRAINT [WorkflowDefinition_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkflowStep] ADD CONSTRAINT [WorkflowStep_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkflowStep] ADD CONSTRAINT [WorkflowStep_definition_id_fkey] FOREIGN KEY ([definition_id]) REFERENCES [dbo].[WorkflowDefinition]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkflowTransition] ADD CONSTRAINT [WorkflowTransition_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkflowTransition] ADD CONSTRAINT [WorkflowTransition_from_step_id_fkey] FOREIGN KEY ([from_step_id]) REFERENCES [dbo].[WorkflowStep]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkflowTransition] ADD CONSTRAINT [WorkflowTransition_to_step_id_fkey] FOREIGN KEY ([to_step_id]) REFERENCES [dbo].[WorkflowStep]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkflowInstance] ADD CONSTRAINT [WorkflowInstance_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkflowInstance] ADD CONSTRAINT [WorkflowInstance_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkflowInstance] ADD CONSTRAINT [WorkflowInstance_definition_id_fkey] FOREIGN KEY ([definition_id]) REFERENCES [dbo].[WorkflowDefinition]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkflowInstance] ADD CONSTRAINT [WorkflowInstance_current_step_id_fkey] FOREIGN KEY ([current_step_id]) REFERENCES [dbo].[WorkflowStep]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkflowAction] ADD CONSTRAINT [WorkflowAction_instance_id_fkey] FOREIGN KEY ([instance_id]) REFERENCES [dbo].[WorkflowInstance]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkflowAction] ADD CONSTRAINT [WorkflowAction_step_id_fkey] FOREIGN KEY ([step_id]) REFERENCES [dbo].[WorkflowStep]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkflowAction] ADD CONSTRAINT [WorkflowAction_performed_by_fkey] FOREIGN KEY ([performed_by]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkflowAction] ADD CONSTRAINT [WorkflowAction_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DailyLog] ADD CONSTRAINT [DailyLog_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DailyLog] ADD CONSTRAINT [DailyLog_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DailyLogLabor] ADD CONSTRAINT [DailyLogLabor_daily_log_id_fkey] FOREIGN KEY ([daily_log_id]) REFERENCES [dbo].[DailyLog]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[DailyLogEquipment] ADD CONSTRAINT [DailyLogEquipment_daily_log_id_fkey] FOREIGN KEY ([daily_log_id]) REFERENCES [dbo].[DailyLog]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[DailyLogMaterial] ADD CONSTRAINT [DailyLogMaterial_daily_log_id_fkey] FOREIGN KEY ([daily_log_id]) REFERENCES [dbo].[DailyLog]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Inspection] ADD CONSTRAINT [Inspection_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Inspection] ADD CONSTRAINT [Inspection_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InspectionItem] ADD CONSTRAINT [InspectionItem_inspection_id_fkey] FOREIGN KEY ([inspection_id]) REFERENCES [dbo].[Inspection]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PunchItem] ADD CONSTRAINT [PunchItem_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PunchItem] ADD CONSTRAINT [PunchItem_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Meeting] ADD CONSTRAINT [Meeting_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Meeting] ADD CONSTRAINT [Meeting_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MeetingAttendee] ADD CONSTRAINT [MeetingAttendee_meeting_id_fkey] FOREIGN KEY ([meeting_id]) REFERENCES [dbo].[Meeting]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MeetingAttendee] ADD CONSTRAINT [MeetingAttendee_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserProjectRole] ADD CONSTRAINT [UserProjectRole_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserProjectRole] ADD CONSTRAINT [UserProjectRole_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CostTransaction] ADD CONSTRAINT [CostTransaction_document_id_fkey] FOREIGN KEY ([document_id]) REFERENCES [dbo].[Document]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CostTransaction] ADD CONSTRAINT [CostTransaction_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[Project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CostTransaction] ADD CONSTRAINT [CostTransaction_wbs_id_fkey] FOREIGN KEY ([wbs_id]) REFERENCES [dbo].[WBSNode]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CostTransaction] ADD CONSTRAINT [CostTransaction_tenant_id_fkey] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CostTransaction] ADD CONSTRAINT [CostTransaction_type_code_fkey] FOREIGN KEY ([type_code]) REFERENCES [dbo].[CostType]([code]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_BudgetLineToControlReport] ADD CONSTRAINT [_BudgetLineToControlReport_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[BudgetLine]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_BudgetLineToControlReport] ADD CONSTRAINT [_BudgetLineToControlReport_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[ControlReport]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_CostTransactionToProjectStock] ADD CONSTRAINT [_CostTransactionToProjectStock_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[CostTransaction]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_CostTransactionToProjectStock] ADD CONSTRAINT [_CostTransactionToProjectStock_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[ProjectStock]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
