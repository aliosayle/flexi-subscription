import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Branch type definition
interface Branch {
  branch_id: number;
  name: string;
  company_id: number;
  company_name: string;
}

// User type definition
interface User {
  id: string;
  name: string;
  email: string;
  role_id: number;
  role_name: string;
  role_description: string;
  permissions: string;
  created_at: string;
  selected_branch_id?: number | null;
}

// Auth context type definition
interface AuthContextType {
  user: User | null;
  token: string | null;
  branches: Branch[];
  selectedBranch: Branch | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User | undefined>;
  register: (name: string, email: string, password: string) => Promise<User | undefined>;
  logout: () => void;
  selectBranch: (branchId: number) => Promise<void>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  branches: [],
  selectedBranch: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => undefined,
  register: async () => undefined,
  logout: () => {},
  selectBranch: async () => {},
});

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);

// Auth provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const navigate = useNavigate();

  // Check for existing auth on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedBranches = localStorage.getItem('branches');
    const storedSelectedBranch = localStorage.getItem('selectedBranch');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      
      if (storedBranches) {
        const parsedBranches = JSON.parse(storedBranches);
        setBranches(parsedBranches);
        
        // If user has multiple branches but none selected, show branch selection dialog
        if (parsedBranches.length > 1 && !storedSelectedBranch) {
          setShowBranchDialog(true);
        }
        
        // If there's a selected branch, set it
        if (storedSelectedBranch) {
          setSelectedBranch(JSON.parse(storedSelectedBranch));
        } else if (parsedBranches.length === 1) {
          // If user has only one branch, set it as selected
          setSelectedBranch(parsedBranches[0]);
          localStorage.setItem('selectedBranch', JSON.stringify(parsedBranches[0]));
        }
      }
    }

    setIsLoading(false);
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/login', { email, password });

      const data = response.data;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      
      setUser(data);
      setToken(data.token);
      
      // If user has branches, store them
      if (data.branches && data.branches.length > 0) {
        setBranches(data.branches);
        localStorage.setItem('branches', JSON.stringify(data.branches));
        
        // If user has only one branch, set it as selected
        if (data.branches.length === 1) {
          setSelectedBranch(data.branches[0]);
          localStorage.setItem('selectedBranch', JSON.stringify(data.branches[0]));
          
          // If user has a previously selected branch, set it
          if (data.selected_branch_id) {
            const branch = data.branches.find((b: Branch) => b.branch_id === data.selected_branch_id);
            if (branch) {
              setSelectedBranch(branch);
              localStorage.setItem('selectedBranch', JSON.stringify(branch));
            }
          }
        } else if (data.branches.length > 1) {
          // If user has multiple branches, show branch selection dialog
          setShowBranchDialog(true);
        }
      }
      
      setIsLoading(false);
      return data;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/register', { name, email, password });

      const data = response.data;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      
      setUser(data);
      setToken(data.token);
      setIsLoading(false);
      
      return data;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  // Select branch function
  const selectBranch = async (branchId: number) => {
    if (!user) return;
    
    try {
      // Update on server
      await api.put(`/api/users/${user.id}/selected-branch`, { branchId });
      
      // Find the branch
      const branch = branches.find(b => b.branch_id === branchId);
      if (branch) {
        // Update locally
        setSelectedBranch(branch);
        localStorage.setItem('selectedBranch', JSON.stringify(branch));
        
        // Update user object
        const updatedUser = { ...user, selected_branch_id: branchId };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        setShowBranchDialog(false);
      }
    } catch (error) {
      console.error('Error selecting branch:', error);
    }
  };

  // Logout function
  const logout = () => {
    // Clear storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('branches');
    localStorage.removeItem('selectedBranch');

    // Reset state
    setToken(null);
    setUser(null);
    setBranches([]);
    setSelectedBranch(null);

    // Redirect to login
    navigate('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        branches,
        selectedBranch,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
        selectBranch,
      }}
    >
      {/* Branch Selection Dialog */}
      <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Branch</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <p className="mb-4 text-sm text-muted-foreground">
              You have access to multiple branches. Please select which branch you want to use.
            </p>
            <Select
              onValueChange={(value) => selectBranch(Number(value))}
              defaultValue={selectedBranch ? selectedBranch.branch_id.toString() : undefined}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.branch_id} value={branch.branch_id.toString()}>
                    {branch.name} ({branch.company_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button 
              onClick={() => {
                if (branches.length > 0 && !selectedBranch) {
                  // If no branch is selected but branches exist, select the first one
                  selectBranch(branches[0].branch_id);
                } else {
                  setShowBranchDialog(false);
                }
              }}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {children}
    </AuthContext.Provider>
  );
}; 