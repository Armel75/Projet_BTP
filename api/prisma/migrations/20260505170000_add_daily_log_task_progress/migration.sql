IF OBJECT_ID(N'[dbo].[DailyLogTaskProgress]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[DailyLogTaskProgress] (
        [id] INT NOT NULL IDENTITY(1,1),
        [daily_log_id] INT NOT NULL,
        [task_id] INT NULL,
        [task_type] NVARCHAR(1000) NOT NULL CONSTRAINT [DailyLogTaskProgress_task_type_df] DEFAULT 'planned',
        [task_title_custom] NVARCHAR(500) NULL,
        [progress_percentage] INT NULL,
        [comment] NVARCHAR(MAX) NULL,
        [photos_url] NVARCHAR(MAX) NULL,
        [labor_data] NVARCHAR(MAX) NULL,
        [equipment_data] NVARCHAR(MAX) NULL,
        [material_data] NVARCHAR(MAX) NULL,
        [created_at] DATETIME2 NOT NULL CONSTRAINT [DF_DailyLogTaskProgress_created_at] DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL,
        CONSTRAINT [DailyLogTaskProgress_pkey] PRIMARY KEY CLUSTERED ([id])
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'DailyLogTaskProgress_daily_log_id_idx'
      AND object_id = OBJECT_ID(N'[dbo].[DailyLogTaskProgress]')
)
BEGIN
    CREATE NONCLUSTERED INDEX [DailyLogTaskProgress_daily_log_id_idx] ON [dbo].[DailyLogTaskProgress]([daily_log_id]);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'DailyLogTaskProgress_task_id_idx'
      AND object_id = OBJECT_ID(N'[dbo].[DailyLogTaskProgress]')
)
BEGIN
    CREATE NONCLUSTERED INDEX [DailyLogTaskProgress_task_id_idx] ON [dbo].[DailyLogTaskProgress]([task_id]);
END;

IF OBJECT_ID(N'[dbo].[DailyLogTaskProgress_daily_log_id_fkey]', N'F') IS NULL
BEGIN
    ALTER TABLE [dbo].[DailyLogTaskProgress]
    ADD CONSTRAINT [DailyLogTaskProgress_daily_log_id_fkey]
    FOREIGN KEY ([daily_log_id]) REFERENCES [dbo].[DailyLog]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
END;

IF OBJECT_ID(N'[dbo].[DailyLogTaskProgress_task_id_fkey]', N'F') IS NULL
BEGIN
    ALTER TABLE [dbo].[DailyLogTaskProgress]
    ADD CONSTRAINT [DailyLogTaskProgress_task_id_fkey]
    FOREIGN KEY ([task_id]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
END;
