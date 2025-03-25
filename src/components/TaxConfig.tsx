import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/axios';

interface TaxConfigProps {
  onTaxChange: (taxRate: number) => void;
}

export const TaxConfig = ({ onTaxChange }: TaxConfigProps) => {
  const [taxRate, setTaxRate] = useState(10);
  const [isEditing, setIsEditing] = useState(false);
  const [tempTaxRate, setTempTaxRate] = useState(10);

  useEffect(() => {
    fetchTaxRate();
  }, []);

  const fetchTaxRate = async () => {
    try {
      const response = await api.get('/api/settings/tax-rate');
      setTaxRate(response.data.taxRate);
      setTempTaxRate(response.data.taxRate);
      onTaxChange(response.data.taxRate);
    } catch (error) {
      console.error('Error fetching tax rate:', error);
      toast.error('Failed to fetch tax rate');
    }
  };

  const handleSave = async () => {
    try {
      await api.put('/api/settings/tax-rate', { taxRate: tempTaxRate });
      setTaxRate(tempTaxRate);
      setIsEditing(false);
      onTaxChange(tempTaxRate);
      toast.success('Tax rate updated successfully');
    } catch (error) {
      console.error('Error updating tax rate:', error);
      toast.error('Failed to update tax rate');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Tax Configuration</span>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          ) : (
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={() => {
                setTempTaxRate(taxRate);
                setIsEditing(false);
              }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="taxRate">Tax Rate (%)</Label>
          <Input
            id="taxRate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={isEditing ? tempTaxRate : taxRate}
            onChange={(e) => setTempTaxRate(Number(e.target.value))}
            disabled={!isEditing}
          />
        </div>
      </CardContent>
    </Card>
  );
}; 