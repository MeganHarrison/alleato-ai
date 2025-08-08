import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// GET /api/user - Get current user information
export async function GET(request: NextRequest) {
  try {
    // In a real application, you would:
    // 1. Get the user ID from the session/JWT token
    // 2. Fetch user data from your database
    
    // For now, return mock data
    const mockUser = {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=john.doe@example.com`
    };
    
    return NextResponse.json({ user: mockUser });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user information' },
      { status: 500 }
    );
  }
}

// PUT /api/user - Update current user information
export async function PUT(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const body = await request.json();
    const { name, email, avatarUrl } = body;
    
    // In a real application, you would:
    // 1. Validate the input
    // 2. Get the user ID from the session/JWT token
    // 3. Update the user in your database
    // 4. Handle avatar upload if needed
    
    // For now, just return the updated data
    const updatedUser = {
      id: '1',
      name: name || 'John Doe',
      email: email || 'john.doe@example.com',
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email || 'john.doe@example.com'}`
    };
    
    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user information' },
      { status: 500 }
    );
  }
}