
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Check, Plus, Pencil, Trash2, Package } from 'lucide-react';
import { SubscriptionPackage } from '@/types';
import { mockPackages } from '@/data/mock-data';

const Packages = () => {
  const [packages, setPackages] = useState<SubscriptionPackage[]>(mockPackages);
  const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleEditPackage = (pkg: SubscriptionPackage) => {
    setSelectedPackage(pkg);
    setIsEditMode(true);
    setDialogOpen(true);
  };

  const handleAddPackage = () => {
    setSelectedPackage(null);
    setIsEditMode(false);
    setDialogOpen(true);
  };

  const handleSavePackage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const days = parseInt(formData.get('days') as string);
    const price = parseFloat(formData.get('price') as string);
    const featuresText = formData.get('features') as string;
    const features = featuresText.split('\n').filter(feature => feature.trim() !== '');
    
    if (isEditMode && selectedPackage) {
      // Update existing package
      const updatedPackages = packages.map(pkg => 
        pkg.id === selectedPackage.id 
          ? {
              ...pkg,
              name,
              description,
              days,
              price,
              features,
              updatedAt: new Date().toISOString()
            }
          : pkg
      );
      
      setPackages(updatedPackages);
      toast.success('Package updated successfully');
    } else {
      // Add new package
      const newPackage: SubscriptionPackage = {
        id: Date.now().toString(),
        name,
        description,
        days,
        price,
        features,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setPackages([...packages, newPackage]);
      toast.success('Package added successfully');
    }
    
    setDialogOpen(false);
  };

  const handleDeletePackage = (id: string) => {
    setPackages(packages.filter(pkg => pkg.id !== id));
    toast.success('Package deleted successfully');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Subscription Packages</h2>
          <p className="text-muted-foreground">Manage your gym membership packages.</p>
        </div>
        <Button onClick={handleAddPackage}>
          <Plus className="mr-2 h-4 w-4" />
          Add Package
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <PackageCard 
            key={pkg.id} 
            package={pkg} 
            onEdit={() => handleEditPackage(pkg)}
            onDelete={() => handleDeletePackage(pkg.id)}
          />
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>All Packages</CardTitle>
          <CardDescription>A detailed view of all available subscription packages.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>A list of all gym subscription packages.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Features</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell className="font-medium">{pkg.name}</TableCell>
                  <TableCell>{pkg.days} days</TableCell>
                  <TableCell>${pkg.price.toFixed(2)}</TableCell>
                  <TableCell>{pkg.features.length} features</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEditPackage(pkg)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeletePackage(pkg.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSavePackage}>
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit Package' : 'Add New Package'}</DialogTitle>
              <DialogDescription>
                {isEditMode 
                  ? 'Update package details below. Click save when you\'re done.'
                  : 'Fill in the package details below. Click save when you\'re done.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={selectedPackage?.name || ''}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={selectedPackage?.description || ''}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="days" className="text-right">
                  Days
                </Label>
                <Input
                  id="days"
                  name="days"
                  type="number"
                  min="1"
                  defaultValue={selectedPackage?.days || 30}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  Price ($)
                </Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={selectedPackage?.price || 0}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="features" className="text-right">
                  Features
                </Label>
                <Textarea
                  id="features"
                  name="features"
                  placeholder="One feature per line"
                  defaultValue={selectedPackage?.features.join('\n') || ''}
                  className="col-span-3"
                  rows={4}
                  required
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface PackageCardProps {
  package: SubscriptionPackage;
  onEdit: () => void;
  onDelete: () => void;
}

const PackageCard = ({ package: pkg, onEdit, onDelete }: PackageCardProps) => {
  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300",
      "hover:shadow-md border-2",
      pkg.isPopular ? "border-primary" : "border-border"
    )}>
      {pkg.isPopular && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold">
          Popular
        </div>
      )}
      
      <CardHeader>
        <CardTitle className="flex items-center">
          <Package className="h-5 w-5 mr-2" />
          {pkg.name}
        </CardTitle>
        <CardDescription>{pkg.description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="mb-6">
          <span className="text-3xl font-bold">${pkg.price.toFixed(2)}</span>
          <span className="text-muted-foreground ml-1">/ {pkg.days} days</span>
        </div>
        
        <ul className="space-y-2">
          {pkg.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <div className="mr-2 h-5 w-5 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-3 w-3 text-primary" />
              </div>
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t pt-4">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="mr-2 h-3 w-3" />
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete}>
          <Trash2 className="mr-2 h-3 w-3" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default Packages;
