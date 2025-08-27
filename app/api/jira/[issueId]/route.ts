import { NextResponse } from 'next/server';

// GET function to handle GET requests
export async function GET(
  request: Request,
  { params }: { params: { issueId: string } }
) {
  const { issueId } = params;

  // 1. Retrieve environment variables
  const domain = process.env.JIRA_DOMAIN;
  const email = process.env.JIRA_USER_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!domain || !email || !apiToken) {
    return NextResponse.json(
      { error: 'Jira environment variables are not set.' },
      { status: 500 }
    );
  }

  // 2. Construct the Jira API URL
  const url = `https://${domain}/rest/api/3/issue/${issueId}`;

  // 3. Create the Authorization header
  const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;

  try {
    // 4. Fetch data from the Jira API
    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // If Jira returns an error, forward it
      return NextResponse.json(
        { error: `Failed to fetch from Jira: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // 5. Return the relevant issue data
    return NextResponse.json({
      id: data.key,
      summary: data.fields.summary,
      description: data.fields.description, // Note: This can be a complex Atlassian Document Format object
      status: data.fields.status.name,
      assignee: data.fields.assignee?.displayName || 'Unassigned',
    });

  } catch (error) {
    console.error('Error fetching Jira issue:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}