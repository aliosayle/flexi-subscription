import React, { useState, useEffect } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Check, Plus, Pencil, Trash2, Package, Loader2 } from 'lucide-react';
import { SubscriptionPackage } from '@/types';
import { Link } from "react-router-dom";

const Packages = () => {
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<string | null>(null);

  // Fetch packages from API
  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/packages');
      
      if (!response.ok) {
        throw new Error('Failed to fetch packages');
      }
      
      const data = await response.json();
      setPackages(data);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch packages on component mount
  useEffect(() => {
    fetchPackages();
  }, []);

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

  const handleSavePackage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    try {
      setLoading(true);
      const formData = new FormData(event.currentTarget);
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const days = parseInt(formData.get('days') as string);
      const price = parseFloat(formData.get('price') as string);
      const featuresText = formData.get('features') as string;
      const features = featuresText.split('\n').filter(feature => feature.trim() !== '');
      const isPopular = selectedPackage?.isPopular || false;
      
      if (isEditMode && selectedPackage) {
        // Update existing package
        const response = await fetch(`http://localhost:5000/api/packages/${selectedPackage.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            description,
            days,
            price,
            features,
            isPopular
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to update package');
        }
        
        toast.success('Package updated successfully');
      } else {
        // Add new package
        const response = await fetch('http://localhost:5000/api/packages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            description,
            days,
            price,
            features,
            isPopular: false
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to add package');
        }
        
        toast.success('Package added successfully');
      }
      
      // Refresh packages list
      fetchPackages();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving package:', error);
      toast.error(isEditMode ? 'Failed to update package' : 'Failed to add package');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setPackageToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!packageToDelete) return;
    
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/packages/${packageToDelete}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete package');
      }
      
      toast.success('Package deleted successfully');
      
      // Refresh packages list
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      toast.error('Failed to delete package');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setPackageToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setPackageToDelete(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Subscription Packages</h2>
          <p className="text-muted-foreground">Manage your gym membership packages.</p>
        </div>
        <Button onClick={handleAddPackage} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Add Package
        </Button>
      </div>

      {loading && packages.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <PackageCard 
                key={pkg.id} 
                package={pkg} 
                onEdit={() => handleEditPackage(pkg)}
                onDelete={() => handleDeleteClick(pkg.id)}
                disabled={loading}
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell>{pkg.days} days</TableCell>
                      <TableCell>${pkg.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditPackage(pkg)}
                          disabled={loading}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteClick(pkg.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

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
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              package and remove it from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel} disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface PackageCardProps {
  package: SubscriptionPackage;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}

// Display a single package as a card
const PackageCard = ({ package: pkg, onEdit, onDelete, disabled = false }: PackageCardProps) => {
  return (
    <Card className={cn("relative overflow-hidden", pkg.isPopular && "border-primary")}>
      {pkg.isPopular && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium">
          Popular
        </div>
      )}
      <CardHeader>
        <CardTitle>{pkg.name}</CardTitle>
        <CardDescription>{pkg.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <span className="text-3xl font-bold">${pkg.price.toFixed(2)}</span>
          <span className="text-muted-foreground"> / {pkg.days} days</span>
        </div>
        
        <ul className="space-y-2">
          {pkg.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="h-5 w-5 text-primary mr-2 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" size="sm" onClick={onEdit} disabled={disabled}>
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete} disabled={disabled}>
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
};

// Utility function for conditional class names
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default Packages;
