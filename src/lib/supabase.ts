import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURAÇÃO DO SUPABASE
// ------------------------------------------------------------------

const SUPABASE_URL = 'https://adezdfmfyvhksayjachp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkZXpkZm1meXZoa3NheWphY2hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NjA0ODUsImV4cCI6MjA4MjQzNjQ4NX0.d3CMHnm-tv7BkC762cMwCwbxGFsSQfLx25sNoiRkh9k';

// Inicialização do Cliente
// IMPORTANTE: 'persistSession: false' é crucial para rodar em ambientes de preview/blob 
// onde o acesso ao localStorage é restrito ou bloqueado pelo navegador.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// ------------------------------------------------------------------
// STORAGE HELPER
// ------------------------------------------------------------------
export const uploadFile = async (file: File, folder: string = 'general') => {
    try {
        // Sanitiza o nome do arquivo para evitar caracteres inválidos na URL
        // Remove tudo que não for alfanumérico, ponto, traço ou underline
        const fileExt = file.name.split('.').pop();
        const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
        const cleanName = baseName.replace(/[^a-zA-Z0-9_\-]/g, "_");
        const fileName = `${folder}/${Date.now()}_${cleanName}.${fileExt}`;

        // Nota: Certifique-se que o bucket 'attachments' existe e é Público no Supabase
        const { error } = await supabase.storage
            .from('attachments')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('attachments')
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (error: any) {
        console.error('Erro no upload:', error);
        throw new Error(error.message || 'Falha ao fazer upload do arquivo.');
    }
};