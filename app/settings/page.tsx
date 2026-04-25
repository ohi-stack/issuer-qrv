import { Card, Input, Button } from '@/components/shared/ui';

export default function Settings(){return <Card><h1>Settings</h1><label>Default QRVID Prefix<Input defaultValue='QRV-CERT' /></label><label>Default Privacy<Input defaultValue='PUBLIC' /></label><Button>Save</Button></Card>;}
