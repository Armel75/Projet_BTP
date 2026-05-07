IF OBJECT_ID(N'[dbo].[DailyLogTaskProgress]', N'U') IS NOT NULL
BEGIN
  -- Étape 1: Rendre task_id nullable (support des activités imprévues)
  ALTER TABLE [dbo].[DailyLogTaskProgress] ALTER COLUMN [task_id] INT NULL;

  -- Étape 2: Supprimer la contrainte unique sur (daily_log_id, task_id)
  -- car task_id peut désormais être NULL et plusieurs activités imprévues sont autorisées
  IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_DailyLogTaskProgress_daily_log_id_task_id'
      AND object_id = OBJECT_ID(N'[dbo].[DailyLogTaskProgress]')
  )
  BEGIN
    DROP INDEX [IX_DailyLogTaskProgress_daily_log_id_task_id] ON [dbo].[DailyLogTaskProgress];
  END;

  -- Étape 3: Ajouter le champ type d'activité
  IF COL_LENGTH(N'dbo.DailyLogTaskProgress', N'task_type') IS NULL
  BEGIN
    ALTER TABLE [dbo].[DailyLogTaskProgress]
      ADD [task_type] NVARCHAR(20) NOT NULL CONSTRAINT [DF_DailyLogTaskProgress_task_type] DEFAULT 'planned';
  END;

  -- Étape 4: Ajouter le titre libre pour les activités imprévues
  IF COL_LENGTH(N'dbo.DailyLogTaskProgress', N'task_title_custom') IS NULL
  BEGIN
    ALTER TABLE [dbo].[DailyLogTaskProgress]
      ADD [task_title_custom] NVARCHAR(500) NULL;
  END;

  -- Étape 5: Ajouter les données main d'oeuvre (JSON array)
  IF COL_LENGTH(N'dbo.DailyLogTaskProgress', N'labor_data') IS NULL
  BEGIN
    ALTER TABLE [dbo].[DailyLogTaskProgress]
      ADD [labor_data] NVARCHAR(MAX) NULL;
  END;

  -- Étape 6: Ajouter les données équipement (JSON array)
  IF COL_LENGTH(N'dbo.DailyLogTaskProgress', N'equipment_data') IS NULL
  BEGIN
    ALTER TABLE [dbo].[DailyLogTaskProgress]
      ADD [equipment_data] NVARCHAR(MAX) NULL;
  END;

  -- Étape 7: Ajouter les données matériaux (JSON array)
  IF COL_LENGTH(N'dbo.DailyLogTaskProgress', N'material_data') IS NULL
  BEGIN
    ALTER TABLE [dbo].[DailyLogTaskProgress]
      ADD [material_data] NVARCHAR(MAX) NULL;
  END;
END;
