import { userFromToken, statementCSV, statementPDF } from '../../../lib/data-mongo';

export async function GET(req) {
  try {
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return new Response(JSON.stringify({ error: 'Missing token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    const token = m[1];
    const user = await userFromToken(token);
    if (!user) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || 'all';
    const format = url.searchParams.get('format') || 'pdf';
    const type = url.searchParams.get('type') || 'all';
    
    if (format === 'pdf') {
      const pdfBuffer = await statementPDF(user.id, user.username, { period, type });
      const typeLabel = type === 'all' ? '' : `-${type}`;
      const filename = `statement-${period}${typeLabel}-${new Date().toISOString().split('T')[0]}.pdf`;
      return new Response(pdfBuffer, { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/pdf', 
          'Content-Disposition': `attachment; filename="${filename}"` 
        } 
      });
    } else if (format === 'csv') {
      const csv = await statementCSV(user.id, { period, type });
      const typeLabel = type === 'all' ? '' : `-${type}`;
      const filename = `statement-${period}${typeLabel}-${new Date().toISOString().split('T')[0]}.csv`;
      return new Response(csv, { 
        status: 200, 
        headers: { 
          'Content-Type': 'text/csv', 
          'Content-Disposition': `attachment; filename="${filename}"` 
        } 
      });
    }
    
    return new Response(JSON.stringify({ error: 'Invalid format' }), { 
      status: 400, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (err) {
    console.error('Statement generation error:', err);
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
}
