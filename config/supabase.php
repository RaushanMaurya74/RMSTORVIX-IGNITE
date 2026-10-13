<?php
declare(strict_types=1);

/**
 * RMSTORVIX IGNITE — Supabase Cloud Database Configuration & Client
 * Project: RMSTORVIX-IGNITE (ynacftlgrvcaiibrycbw)
 */

return [
    'url' => getenv('SUPABASE_URL') ?: 'https://ynacftlgrvcaiibrycbw.supabase.co',
    'anon_key' => getenv('SUPABASE_ANON_KEY') ?: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYWNmdGxncnZjYWlpYnJ5Y2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MTIwNTQsImV4cCI6MjEwNzQ4ODA1NH0.cM5wpNrb9YJSkrk4CcQM3aVDqXqLL9qnvGkDiTbog34',
    'project_id' => getenv('SUPABASE_PROJECT_ID') ?: 'ynacftlgrvcaiibrycbw',
    'region' => 'ap-northeast-1',
    'db_host' => 'db.ynacftlgrvcaiibrycbw.supabase.co',
    'db_port' => 5432,
];
