
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Save, Building, CreditCard, Receipt, User, BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';

const Settings = () => {
  const [businessName, setBusinessName] = useState('FlexiGym Fitness');
  const [address, setAddress] = useState('123 Fitness Avenue, Healthytown, CA 90210');
  const [phone, setPhone] = useState('(555) 123-4567');
  const [email, setEmail] = useState('info@flexigym.com');
  const [taxRate, setTaxRate] = useState('10');
  const [receiptFooter, setReceiptFooter] = useState('Thank you for choosing FlexiGym Fitness!');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [dailyReports, setDailyReports] = useState(false);
  
  const handleSaveGeneralSettings = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('General settings saved successfully');
  };
  
  const handleSaveNotificationSettings = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Notification settings saved successfully');
  };
  
  const handleSavePOSSettings = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('POS settings saved successfully');
  };
  
  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your system settings and preferences.</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="general" className="flex items-center">
            <Building className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="pos" className="flex items-center">
            <CreditCard className="h-4 w-4 mr-2" />
            POS
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center">
            <BellRing className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4 mt-6">
          <Card>
            <form onSubmit={handleSaveGeneralSettings}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Business Information
                </CardTitle>
                <CardDescription>
                  Update your gym's basic information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="business-name">Business Name</Label>
                    <Input 
                      id="business-name" 
                      value={businessName} 
                      onChange={(e) => setBusinessName(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea 
                    id="address" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input 
                      id="phone" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                    <Input 
                      id="tax-rate" 
                      type="number" 
                      min="0" 
                      max="100" 
                      step="0.01" 
                      value={taxRate} 
                      onChange={(e) => setTaxRate(e.target.value)} 
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile
              </CardTitle>
              <CardDescription>
                Update your personal profile and password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-medium">
                    AD
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="font-medium">Admin User</h3>
                  <p className="text-sm text-muted-foreground">admin@flexigym.com</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" />
                </div>
                <div></div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" type="password" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>
                <Save className="h-4 w-4 mr-2" />
                Update Password
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="pos" className="space-y-4 mt-6">
          <Card>
            <form onSubmit={handleSavePOSSettings}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Point of Sale Settings
                </CardTitle>
                <CardDescription>
                  Configure your POS system settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Receipt Settings</h3>
                  
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="receipt-header">Receipt Header</Label>
                      <Input id="receipt-header" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receipt-footer">Receipt Footer</Label>
                      <Input 
                        id="receipt-footer" 
                        value={receiptFooter} 
                        onChange={(e) => setReceiptFooter(e.target.value)} 
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch id="show-tax" defaultChecked />
                    <Label htmlFor="show-tax">Show Tax Details on Receipt</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch id="auto-print" defaultChecked />
                    <Label htmlFor="auto-print">Automatically Print Receipts</Label>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Payment Options</h3>
                  
                  <div className="flex items-center space-x-2">
                    <Switch id="accept-cash" defaultChecked />
                    <Label htmlFor="accept-cash">Accept Cash Payments</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch id="accept-card" defaultChecked />
                    <Label htmlFor="accept-card">Accept Card Payments</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch id="allow-split" />
                    <Label htmlFor="allow-split">Allow Split Payments</Label>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  Save POS Settings
                </Button>
              </CardFooter>
            </form>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Receipt className="h-5 w-5 mr-2" />
                Barcode Scanner
              </CardTitle>
              <CardDescription>
                Configure barcode scanner settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="auto-submit" defaultChecked />
                <Label htmlFor="auto-submit">Auto Submit After Scan</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="beep-on-scan" defaultChecked />
                <Label htmlFor="beep-on-scan">Sound Beep On Successful Scan</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scan-prefix">Barcode Prefix (if applicable)</Label>
                <Input id="scan-prefix" placeholder="Leave empty if not used" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scan-suffix">Barcode Suffix (if applicable)</Label>
                <Input id="scan-suffix" placeholder="Leave empty if not used" />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>
                <Save className="h-4 w-4 mr-2" />
                Save Scanner Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4 mt-6">
          <Card>
            <form onSubmit={handleSaveNotificationSettings}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BellRing className="h-5 w-5 mr-2" />
                  Notification Settings
                </CardTitle>
                <CardDescription>
                  Choose which notifications you wish to receive.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Email Notifications</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive important notifications via email
                      </p>
                    </div>
                    <Switch 
                      id="email-notifications" 
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="low-stock">Low Stock Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when inventory items are running low
                      </p>
                    </div>
                    <Switch 
                      id="low-stock" 
                      checked={lowStockAlerts}
                      onCheckedChange={setLowStockAlerts}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="daily-reports">Daily Reports</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive daily sales and activity reports
                      </p>
                    </div>
                    <Switch 
                      id="daily-reports" 
                      checked={dailyReports}
                      onCheckedChange={setDailyReports}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">System Notifications</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="browser-notifications">Browser Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Show notifications in the browser
                      </p>
                    </div>
                    <Switch id="browser-notifications" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sound-alerts">Sound Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Play sound when notifications arrive
                      </p>
                    </div>
                    <Switch id="sound-alerts" defaultChecked />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label htmlFor="notification-email">Notification Email</Label>
                  <Input 
                    id="notification-email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                  />
                  <p className="text-sm text-muted-foreground">
                    Where should we send your notifications?
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  Save Notification Settings
                </Button>
              </CardFooter>
            </form>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="h-5 w-5 mr-2" />
                System Preferences
              </CardTitle>
              <CardDescription>
                Additional system settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-logout">Auto Logout</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically log out after period of inactivity
                  </p>
                </div>
                <Switch id="auto-logout" defaultChecked />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timeout-period">Inactivity Timeout (minutes)</Label>
                <Input id="timeout-period" type="number" min="1" defaultValue="30" />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="confirm-actions">Confirm Critical Actions</Label>
                  <p className="text-sm text-muted-foreground">
                    Show confirmation dialog for important actions
                  </p>
                </div>
                <Switch id="confirm-actions" defaultChecked />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
