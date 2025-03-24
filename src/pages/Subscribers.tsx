import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, CreditCard, Calendar } from 'lucide-react';

interface Subscriber {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  emergency_contact: string;
  emergency_phone: string;
  total_subscriptions: number;
  current_status: string;
  latest_end_date: string;
}

interface Package {
  id: string;
  name: string;
  price: number;
  days: number;
}

interface Subscription {
  id: number;
  subscriber_id: number;
  package_id: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  payment_status: 'paid' | 'pending' | 'failed';
  total_amount: number;
  amount_paid: number;
  payment_method: string;
  package_name: string;
  package_days: number;
  package_price: number;
}

const subscriberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
});

const subscriptionSchema = z.object({
  package_id: z.string().min(1, 'Package is required'),
  start_date: z.string().min(1, 'Start date is required'),
  payment_method: z.string().min(1, 'Payment method is required'),
  notes: z.string().optional(),
});

const Subscribers = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const form = useForm<z.infer<typeof subscriberSchema>>({
    resolver: zodResolver(subscriberSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      date_of_birth: '',
      gender: 'other',
      emergency_contact: '',
      emergency_phone: '',
    },
  });

  const subscriptionForm = useForm<z.infer<typeof subscriptionSchema>>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      package_id: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: 'cash',
      notes: '',
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subscribersRes, packagesRes] = await Promise.all([
        axios.get('http://localhost:5000/api/subscribers', {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }),
        axios.get('http://localhost:5000/api/packages', {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      setSubscribers(subscribersRes.data);
      setPackages(packagesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof subscriberSchema>) => {
    try {
      if (selectedSubscriber) {
        await axios.put(
          `http://localhost:5000/api/subscribers/${selectedSubscriber.id}`,
          values,
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
        toast.success('Subscriber updated successfully');
      } else {
        await axios.post(
          'http://localhost:5000/api/subscribers',
          values,
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
        toast.success('Subscriber added successfully');
      }
      setIsAddDialogOpen(false);
      setIsEditDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving subscriber:', error);
      toast.error('Failed to save subscriber');
    }
  };

  const onSubscriptionSubmit = async (values: z.infer<typeof subscriptionSchema>) => {
    if (!selectedSubscriber) return;

    try {
      const selectedPackage = packages.find(p => p.id === values.package_id);
      if (!selectedPackage) return;

      const startDate = new Date(values.start_date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + selectedPackage.days);

      await axios.post(
        'http://localhost:5000/api/subscriptions',
        {
          subscriber_id: selectedSubscriber.id,
          package_id: values.package_id,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          total_amount: selectedPackage.price,
          payment_method: values.payment_method,
          notes: values.notes,
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      toast.success('Subscription created successfully');
      setIsSubscriptionDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Failed to create subscription');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this subscriber?')) return;

    try {
      await axios.delete(`http://localhost:5000/api/subscribers/${id}`, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Subscriber deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting subscriber:', error);
      toast.error('Failed to delete subscriber');
    }
  };

  const handleEdit = (subscriber: Subscriber) => {
    setSelectedSubscriber(subscriber);
    form.reset({
      name: subscriber.name,
      email: subscriber.email || '',
      phone: subscriber.phone || '',
      address: subscriber.address || '',
      date_of_birth: subscriber.date_of_birth || '',
      gender: subscriber.gender || 'other',
      emergency_contact: subscriber.emergency_contact || '',
      emergency_phone: subscriber.emergency_phone || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleAddSubscription = (subscriber: Subscriber) => {
    setSelectedSubscriber(subscriber);
    subscriptionForm.reset({
      package_id: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: 'cash',
      notes: '',
    });
    setIsSubscriptionDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Subscribers</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Subscriber
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Subscriber</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergency_contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergency_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Add Subscriber
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Subscriptions</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscribers.map((subscriber) => (
            <TableRow key={subscriber.id}>
              <TableCell>{subscriber.name}</TableCell>
              <TableCell>
                <div>
                  <div>{subscriber.email || 'No email'}</div>
                  <div className="text-sm text-muted-foreground">
                    {subscriber.phone || 'No phone'}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div>{subscriber.total_subscriptions} subscriptions</div>
                  {subscriber.latest_end_date && (
                    <div className="text-sm text-muted-foreground">
                      Expires: {format(new Date(subscriber.latest_end_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    subscriber.current_status === 'active'
                      ? 'default'
                      : subscriber.current_status === 'expired'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {subscriber.current_status || 'No active subscription'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleAddSubscription(subscriber)}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(subscriber)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(subscriber.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscriber</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Same form fields as Add Dialog */}
              <Button type="submit" className="w-full">
                Update Subscriber
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Subscription Dialog */}
      <Dialog open={isSubscriptionDialogOpen} onOpenChange={setIsSubscriptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Subscription</DialogTitle>
          </DialogHeader>
          <Form {...subscriptionForm}>
            <form onSubmit={subscriptionForm.handleSubmit(onSubscriptionSubmit)} className="space-y-4">
              <FormField
                control={subscriptionForm.control}
                name="package_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a package" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {packages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.name} - ${pkg.price} ({pkg.days} days)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subscriptionForm.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subscriptionForm.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subscriptionForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                Create Subscription
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subscribers; 