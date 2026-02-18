import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    // Procesa el JSON recibido aquí
    // Ejemplo: guardar en una tabla llamada 'data'
    const { error } = await supabase.from('data').insert([data]);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Error procesando datos' }, { status: 400 });
  }
}
