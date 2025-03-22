
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  UserPlus, 
  Users, 
  ShieldCheck, 
  Settings, 
  Pencil, 
  Trash, 
  CheckCircle, 
  XCircle, 
  Package, 
  Boxes, 
  ShoppingCart 
} from 'lucide-react';
import { User, Role, Permission } from '@/types';
import { mockUsers, mockRoles, mockPermissions } from '@/data/mock-data';
import { cn } from '@/lib/utils';

type TabType = 'users' | 'roles';

const UsersPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [roles, setRoles] = useState<Role[]>(mockRoles);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  
  // User management
  const handleAddUser = () => {
    setSelectedUser(null);
    setIsUserDialogOpen(true);
  };
  
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsUserDialogOpen(true);
  };
  
  const handleSaveUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const roleId = formData.get('role') as string;
    const active = formData.get('active') === 'on';
    
    const role = roles.find(r => r.id === roleId);
    
    if (!role) {
      toast.error('Invalid role selected');
      return;
    }
    
    if (selectedUser) {
      // Update existing user
      const updatedUsers = users.map(user => 
        user.id === selectedUser.id 
          ? {
              ...user,
              name,
              email,
              role,
              active,
              updatedAt: new Date().toISOString()
            }
          : user
      );
      
      setUsers(updatedUsers);
      toast.success('User updated successfully');
    } else {
      // Add new user
      const newUser: User = {
        id: Date.now().toString(),
        name,
        email,
        role,
        active,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setUsers([...users, newUser]);
      toast.success('User added successfully');
    }
    
    setIsUserDialogOpen(false);
  };
  
  const handleDeleteUser = (id: string) => {
    setUsers(users.filter(user => user.id !== id));
    toast.success('User deleted successfully');
  };
  
  // Role management
  const handleAddRole = () => {
    setSelectedRole(null);
    setIsRoleDialogOpen(true);
  };
  
  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setIsRoleDialogOpen(true);
  };
  
  const handleSaveRole = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    
    const selectedPermissions: Permission[] = [];
    mockPermissions.forEach(permission => {
      if (formData.get(`permission-${permission.id}`) === 'on') {
        selectedPermissions.push(permission);
      }
    });
    
    if (selectedRole) {
      // Update existing role
      const updatedRoles = roles.map(role => 
        role.id === selectedRole.id 
          ? {
              ...role,
              name,
              description,
              permissions: selectedPermissions,
              updatedAt: new Date().toISOString()
            }
          : role
      );
      
      setRoles(updatedRoles);
      
      // Update users with this role
      const updatedUsers = users.map(user => {
        if (user.role.id === selectedRole.id) {
          return {
            ...user,
            role: {
              ...user.role,
              name,
              description,
              permissions: selectedPermissions,
              updatedAt: new Date().toISOString()
            }
          };
        }
        return user;
      });
      
      setUsers(updatedUsers);
      toast.success('Role updated successfully');
    } else {
      // Add new role
      const newRole: Role = {
        id: Date.now().toString(),
        name,
        description,
        permissions: selectedPermissions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setRoles([...roles, newRole]);
      toast.success('Role added successfully');
    }
    
    setIsRoleDialogOpen(false);
  };
  
  const handleDeleteRole = (id: string) => {
    // Check if any users have this role
    const usersWithRole = users.filter(user => user.role.id === id);
    
    if (usersWithRole.length > 0) {
      toast.error(`Cannot delete role: ${usersWithRole.length} users are assigned to this role`);
      return;
    }
    
    setRoles(roles.filter(role => role.id !== id));
    toast.success('Role deleted successfully');
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Manage users, roles, and permissions.</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'users' ? (
            <Button onClick={handleAddUser}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          ) : (
            <Button onClick={handleAddRole}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Add Role
            </Button>
          )}
        </div>
      </div>

      <Tabs 
        defaultValue="users" 
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabType)}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="users" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Roles & Permissions
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Manage user accounts and their roles.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          {user.role.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.active ? (
                          <span className="inline-flex items-center text-green-600 text-sm">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-red-600 text-sm">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.lastLogin 
                          ? new Date(user.lastLogin).toLocaleDateString() 
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditUser(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={user.id === '1'} // Prevent deleting the admin user
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>Manage roles and their associated permissions.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => {
                    const userCount = users.filter(user => user.role.id === role.id).length;
                    
                    return (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell>{role.description}</TableCell>
                        <TableCell>{role.permissions.length} permissions</TableCell>
                        <TableCell>{userCount} users</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditRole(role)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteRole(role.id)}
                            disabled={role.id === '1' || userCount > 0} // Prevent deleting the admin role or roles with users
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit User Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSaveUser}>
            <DialogHeader>
              <DialogTitle>
                {selectedUser ? 'Edit User' : 'Add New User'}
              </DialogTitle>
              <DialogDescription>
                Fill in the user details below. Click save when you're done.
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
                  defaultValue={selectedUser?.name || ''}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={selectedUser?.email || ''}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role
                </Label>
                <Select 
                  name="role"
                  defaultValue={selectedUser?.role.id || roles[0].id}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="active" className="text-right">
                  Status
                </Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Checkbox 
                    id="active" 
                    name="active" 
                    defaultChecked={selectedUser ? selectedUser.active : true} 
                  />
                  <label
                    htmlFor="active"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Active
                  </label>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsUserDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {selectedUser ? 'Update User' : 'Add User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleSaveRole}>
            <DialogHeader>
              <DialogTitle>
                {selectedRole ? 'Edit Role' : 'Add New Role'}
              </DialogTitle>
              <DialogDescription>
                Configure the role and select permissions.
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
                  defaultValue={selectedRole?.name || ''}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={selectedRole?.description || ''}
                  className="col-span-3"
                  required
                />
              </div>
              
              <div className="border rounded-md p-4 mt-2">
                <h3 className="font-medium mb-3">Permissions</h3>
                
                <div className="space-y-4">
                  <PermissionGroup
                    title="Subscription Packages"
                    icon={<Package className="h-4 w-4" />}
                    permissions={mockPermissions.filter(p => p.module === 'packages')}
                    selectedPermissions={selectedRole?.permissions || []}
                  />
                  
                  <PermissionGroup
                    title="Inventory Management"
                    icon={<Boxes className="h-4 w-4" />}
                    permissions={mockPermissions.filter(p => p.module === 'inventory')}
                    selectedPermissions={selectedRole?.permissions || []}
                  />
                  
                  <PermissionGroup
                    title="Point of Sale"
                    icon={<ShoppingCart className="h-4 w-4" />}
                    permissions={mockPermissions.filter(p => p.module === 'pos')}
                    selectedPermissions={selectedRole?.permissions || []}
                  />
                  
                  <PermissionGroup
                    title="User Management"
                    icon={<Users className="h-4 w-4" />}
                    permissions={mockPermissions.filter(p => p.module === 'users')}
                    selectedPermissions={selectedRole?.permissions || []}
                  />
                  
                  <PermissionGroup
                    title="Settings"
                    icon={<Settings className="h-4 w-4" />}
                    permissions={mockPermissions.filter(p => p.module === 'settings')}
                    selectedPermissions={selectedRole?.permissions || []}
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsRoleDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {selectedRole ? 'Update Role' : 'Add Role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface PermissionGroupProps {
  title: string;
  icon: React.ReactNode;
  permissions: Permission[];
  selectedPermissions: Permission[];
}

const PermissionGroup = ({ title, icon, permissions, selectedPermissions }: PermissionGroupProps) => {
  return (
    <div>
      <div className="flex items-center mb-2">
        {icon}
        <h4 className="font-medium ml-2">{title}</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
        {permissions.map((permission) => {
          const isChecked = selectedPermissions.some(p => p.id === permission.id);
          
          return (
            <div key={permission.id} className="flex items-center space-x-2">
              <Checkbox 
                id={`permission-${permission.id}`} 
                name={`permission-${permission.id}`} 
                defaultChecked={isChecked} 
              />
              <label
                htmlFor={`permission-${permission.id}`}
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {permission.description}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UsersPage;
