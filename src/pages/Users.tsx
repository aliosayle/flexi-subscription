import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User, 
  Shield, 
  Trash2, 
  Edit2, 
  Plus,
  AlertCircle,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  name: string;
  email: string;
  role_id: number;
  role_name: string;
  role_description: string;
  permissions: string;
  created_at: string;
  password?: string;
  selected_branch_id?: number | null;
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string;
}

interface Permission {
  id: number;
  name: string;
  description: string;
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role_id: number;
  role_name: string;
  role_description: string;
  permissions: string;
  created_at: string;
}

interface Branch {
  id: number;
  name: string;
  company_id: number;
  company_name: string;
}

interface UserBranch {
  id: number;
  user_id: string;
  branch_id: number;
  branch_name: string;
  company_id: number;
  company_name: string;
  is_main: boolean;
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userBranches, setUserBranches] = useState<UserBranch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  
  const { user: currentUser, token } = useAuth();
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes, branchesRes] = await Promise.all([
        api.get<User[]>('/api/users'),
        api.get<Role[]>('/api/roles'),
        api.get<Branch[]>('/api/branches')
      ]);
      
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setBranches(branchesRes.data);
      
      // Extract unique permissions from roles
      const allPermissions = rolesRes.data.reduce((acc: Permission[], role: Role) => {
        const rolePermissions = role.permissions.split(',').map((name: string) => ({
          id: Math.random(), // In a real app, this would come from the backend
          name,
          description: `Permission to ${name.replace('_', ' ')}`
        }));
        return [...acc, ...rolePermissions];
      }, []);
      
      // Remove duplicates
      const uniquePermissions = Array.from(
        new Map(allPermissions.map(p => [p.name, p])).values()
      );
      
      setPermissions(uniquePermissions);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateRole = async () => {
    if (!selectedUser?.id) return;
    
    try {
      await api.put(`/api/users/${selectedUser.id}/role`, {
        roleId: selectedRole.id
      });
      
      toast.success('User role updated successfully');
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole(null);
      fetchData();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };
  
  const handleAddUser = async () => {
    if (!selectedUser?.name || !selectedUser?.email || !selectedUser?.password || !selectedUser?.role_id) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      const response = await api.post('/api/users', {
        name: selectedUser.name,
        email: selectedUser.email,
        password: selectedUser.password,
        role_id: selectedUser.role_id
      });
      
      toast.success('User created successfully');
      setIsRoleDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  };
  
  const handleUpdatePermissions = async () => {
    if (!selectedRole) return;
    
    try {
      await api.put(`/api/roles/${selectedRole.id}/permissions`, {
        permissions: selectedPermissions
      });
      
      toast.success('Role permissions updated successfully');
      setIsPermissionsDialogOpen(false);
      setSelectedRole(null);
      setSelectedPermissions([]);
      fetchData();
    } catch (error) {
      console.error('Error updating role permissions:', error);
      toast.error('Failed to update role permissions');
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    try {
      await api.delete(`/api/users/${userId}`);
      toast.success('User deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };
  
  const handleFetchUserBranches = async (userId: string) => {
    try {
      const response = await api.get(`/api/users/${userId}/branches`);
      setUserBranches(response.data);
    } catch (error) {
      console.error('Error fetching user branches:', error);
      toast.error('Failed to load user branches');
    }
  };

  const handleAssignBranch = async () => {
    if (!selectedUser?.id || !selectedBranchId) {
      toast.error('Please select a branch');
      return;
    }

    try {
      await api.post(`/api/users/${selectedUser.id}/branches`, {
        branchId: selectedBranchId
      });
      
      toast.success('Branch assigned successfully');
      await handleFetchUserBranches(selectedUser.id);
      setSelectedBranchId("");
    } catch (error: any) {
      console.error('Error assigning branch:', error);
      toast.error(error.response?.data?.error || 'Failed to assign branch');
    }
  };

  const handleRemoveBranch = async (userId: string, branchId: number) => {
    try {
      await api.delete(`/api/users/${userId}/branches/${branchId}`);
      toast.success('Branch removed successfully');
      await handleFetchUserBranches(userId);
    } catch (error) {
      console.error('Error removing branch:', error);
      toast.error('Failed to remove branch');
    }
  };
  
  const canManageUsers = currentUser?.role_name === 'admin' || currentUser?.role_name === 'super_admin';
  
  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Users
              </CardTitle>
              <CardDescription>
                Manage user accounts and permissions
              </CardDescription>
            </div>
            <Button onClick={() => {
              setSelectedUser({
                id: '',
                name: '',
                email: '',
                role_id: 0,
                role_name: '',
                role_description: '',
                permissions: '',
                created_at: new Date().toISOString()
              });
              setIsRoleDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Branches</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => {
                          setSelectedUser(user);
                          setIsRoleDialogOpen(true);
                        }}
                      >
                        {user.role_name || 'No Role'}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.permissions?.split(',').map((permission) => (
                          <span
                            key={permission}
                            className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
                          >
                            {permission}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => {
                          setSelectedUser(user);
                          handleFetchUserBranches(user.id);
                          setIsBranchDialogOpen(true);
                        }}
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Manage
                      </Button>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const role = roles.find(r => r.id === user.role_id);
                            if (role) {
                              setSelectedRole(role);
                              setSelectedPermissions(
                                role.permissions.split(',').map(p => 
                                  permissions.find(perm => perm.name === p)?.id || 0
                                ).filter(Boolean)
                              );
                              setIsPermissionsDialogOpen(true);
                            }
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Role Selection Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedUser?.id ? 'Update User Role' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {selectedUser?.id 
                ? `Select a role for ${selectedUser.name}`
                : 'Fill in the user details and select a role'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {!selectedUser?.id && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={selectedUser?.name || ''}
                    onChange={(e) => {
                      if (selectedUser) {
                        setSelectedUser({
                          ...selectedUser,
                          name: e.target.value
                        });
                      }
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={selectedUser?.email || ''}
                    onChange={(e) => {
                      if (selectedUser) {
                        setSelectedUser({
                          ...selectedUser,
                          email: e.target.value
                        });
                      }
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={selectedUser?.password || ''}
                    onChange={(e) => {
                      if (selectedUser) {
                        setSelectedUser({
                          ...selectedUser,
                          password: e.target.value
                        });
                      }
                    }}
                    required
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={selectedUser?.role_id?.toString()}
                onValueChange={(value) => {
                  if (selectedUser) {
                    setSelectedUser({
                      ...selectedUser,
                      role_id: parseInt(value)
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={selectedUser?.id ? handleUpdateRole : handleAddUser}>
              {selectedUser?.id ? 'Update Role' : 'Add User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Role Permissions</DialogTitle>
            <DialogDescription>
              Select permissions for {selectedRole?.name} role
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {permissions.map((permission) => (
              <div key={permission.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`permission-${permission.id}`}
                  checked={selectedPermissions.includes(permission.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedPermissions([...selectedPermissions, permission.id]);
                    } else {
                      setSelectedPermissions(
                        selectedPermissions.filter(id => id !== permission.id)
                      );
                    }
                  }}
                />
                <Label htmlFor={`permission-${permission.id}`}>
                  {permission.name.replace('_', ' ')}
                </Label>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePermissions}>
              Update Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch Assignment Dialog */}
      <Dialog open={isBranchDialogOpen} onOpenChange={setIsBranchDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage User Branches</DialogTitle>
            <DialogDescription>
              Assign branches to {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Assigned Branches</h3>
              
              {userBranches.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">
                  No branches assigned to this user yet
                </div>
              ) : (
                <ScrollArea className="h-48 border rounded-md p-4">
                  <div className="space-y-2">
                    {userBranches.map((branch) => (
                      <div 
                        key={branch.branch_id} 
                        className="flex items-center justify-between border-b pb-2"
                      >
                        <div>
                          <p className="font-medium">{branch.branch_name}</p>
                          <p className="text-sm text-muted-foreground">{branch.company_name}</p>
                          {branch.is_main && (
                            <Badge variant="secondary" className="mt-1">
                              Main Branch
                            </Badge>
                          )}
                          {selectedUser?.selected_branch_id === branch.branch_id && (
                            <Badge className="mt-1 ml-2">
                              Currently Selected
                            </Badge>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRemoveBranch(selectedUser!.id, branch.branch_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
            
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium">Assign New Branch</h3>
              
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="branch">Branch</Label>
                  <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches
                        .filter(branch => !userBranches.some(ub => ub.branch_id === branch.id))
                        .map((branch) => (
                          <SelectItem key={branch.id} value={branch.id.toString()}>
                            {branch.name} ({branch.company_name})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAssignBranch}>
                  Assign
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
