import { NextResponse } from 'next/server';
import settings from './settings.json';

export async function GET() {
  try {
    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    console.error('[settings] Failed to load settings:', error);
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 },
    );
  }
}
