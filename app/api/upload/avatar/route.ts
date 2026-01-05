import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/auth-server";
import { uploadImage, deleteImage, extractPublicId } from "@/lib/cloudinary";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { image } = await request.json();

        if (!image) {
            return NextResponse.json({ error: 'Imagem obrigatória' }, { status: 400 });
        }

        // Validar que é uma imagem base64 válida
        if (!image.startsWith('data:image/')) {
            return NextResponse.json({ error: 'Formato de imagem inválido' }, { status: 400 });
        }

        const adminDb = createAdminClient();

        // Buscar avatar atual do usuário
        const { data: profile } = await adminDb
            .from('profiles')
            .select('avatar_url')
            .eq('id', payload.userId)
            .single();

        // Se já tem avatar, deletar o antigo do Cloudinary
        if (profile?.avatar_url) {
            const publicId = extractPublicId(profile.avatar_url);
            if (publicId) {
                await deleteImage(publicId);
            }
        }

        // Upload da nova imagem para o Cloudinary
        const avatarUrl = await uploadImage(image, 'juntin/avatars');

        // Atualizar no banco de dados
        const { error: updateError } = await adminDb
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', payload.userId);

        if (updateError) throw updateError;

        return NextResponse.json({
            avatar_url: avatarUrl,
            message: 'Avatar atualizado com sucesso'
        });

    } catch (e: any) {
        console.error('[Upload Avatar Error]:', e);
        return NextResponse.json({ error: e.message || 'Erro ao fazer upload' }, { status: 500 });
    }
}
