import { Card } from '../shared/ui';

export function QRCodePreview({ qrvid }: { qrvid: string }) { return <Card><h3>QR Preview</h3><div style={{width:160,height:160,background:'#f3f4f6',display:'grid',placeItems:'center'}} className="mono">{qrvid}</div></Card>; }
