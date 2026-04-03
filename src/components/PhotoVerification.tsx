import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, CheckCircle, Loader2, X, ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface PhotoVerificationProps {
  requestId: string;
  type: 'pickup' | 'delivery';
  existingUrl?: string | null;
  onUploaded: (url: string) => void;
}

const PhotoVerification = ({ requestId, type, existingUrl, onUploaded }: PhotoVerificationProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingUrl || null);
  const [showPreview, setShowPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${type}/${requestId}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('food-images')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('food-images')
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;

      const column = type === 'pickup' ? 'pickup_photo_url' : 'delivery_photo_url';
      const { error: updateError } = await supabase
        .from('pickup_requests')
        .update({ [column]: publicUrl })
        .eq('id', requestId);

      if (updateError) throw updateError;

      setPreviewUrl(publicUrl);
      onUploaded(publicUrl);
      toast.success(`${type === 'pickup' ? 'Pickup' : 'Delivery'} photo uploaded!`);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onInputChange}
      />

      {previewUrl ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            {type === 'pickup' ? 'Pickup' : 'Delivery'} photo ✓
          </button>
          {!existingUrl && (
            <button
              onClick={() => { setPreviewUrl(null); }}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="gap-1.5"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
          {uploading
            ? 'Uploading...'
            : type === 'pickup'
              ? 'Photo: Pickup'
              : 'Photo: Delivery'}
        </Button>
      )}

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{type === 'pickup' ? 'Pickup' : 'Delivery'} Verification Photo</DialogTitle>
            <DialogDescription>
              Proof of {type} for this request
            </DialogDescription>
          </DialogHeader>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={`${type} verification`}
              className="w-full rounded-lg border border-border"
            />
          ) : (
            <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoVerification;
