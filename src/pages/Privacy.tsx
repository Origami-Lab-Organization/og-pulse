import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import logo from '@/assets/logo.png';

const Privacy = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <img src={logo} alt="Propulsr" className="h-12 w-12" />
        </div>
        <CardTitle className="text-2xl">Política de Privacidade</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-muted-foreground">Em breve.</p>
        <Link to="/register" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
      </CardContent>
    </Card>
  </div>
);

export default Privacy;
