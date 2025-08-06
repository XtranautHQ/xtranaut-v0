import { NextRequest, NextResponse } from 'next/server';
import { initializationService } from '@/services/initializationService';

export async function POST(request: NextRequest) {
  try {
    await initializationService.initializeApplication();
    
    return NextResponse.json({
      success: true,
      message: 'Application initialized successfully'
    });
    
  } catch (error) {
    console.error('Initialization error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const isHealthy = await initializationService.checkDatabaseHealth();
    
    return NextResponse.json({
      success: true,
      healthy: isHealthy,
      message: isHealthy ? 'Database is healthy' : 'Database health check failed'
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { 
        success: false,
        healthy: false,
        error: error instanceof Error ? error.message : 'Health check failed' 
      },
      { status: 500 }
    );
  }
}