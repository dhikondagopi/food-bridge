import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VolunteerRatingProps {
  pickupRequestId: string;
  volunteerId: string;
  ngoId: string;
  volunteerName: string;
  existingRating?: { rating: number; feedback: string | null } | null;
  onRated?: () => void;
}

export default function VolunteerRating({
  pickupRequestId,
  volunteerId,
  ngoId,
  volunteerName,
  existingRating,
  onRated,
}: VolunteerRatingProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [feedback, setFeedback] = useState(existingRating?.feedback || '');
  const [submitting, setSubmitting] = useState(false);

  // Optional: Reset state when dialog opens/closes to prevent stale data
  useEffect(() => {
    if (open) {
      setRating(existingRating?.rating || 0);
      setFeedback(existingRating?.feedback || '');
      setHoveredStar(0);
    }
  }, [open, existingRating]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        pickup_request_id: pickupRequestId,
        volunteer_id: volunteerId,
        ngo_id: ngoId,
        rating,
        feedback: feedback.trim() || null,
      };

      const { error } = existingRating
        ? await supabase
            .from('volunteer_ratings')
            .update({ rating, feedback: feedback.trim() || null })
            .eq('pickup_request_id', pickupRequestId)
            .eq('volunteer_id', volunteerId) // Made this more specific
        : await supabase.from('volunteer_ratings').insert(payload);

      if (error) {
        toast.error('Failed to submit rating');
        console.error(error);
        return;
      }

      toast.success(existingRating ? 'Rating updated!' : 'Rating submitted!');
      setOpen(false);
      onRated?.();
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoveredStar || rating;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Star className="h-3.5 w-3.5" />
          {existingRating ? 'Update Rating' : 'Rate Volunteer'}
        </Button>
      </DialogTrigger>

      {/* ✅ SINGLE DialogContent (CORRECT) */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {existingRating ? 'Update Rating' : 'Rate Volunteer'}: {volunteerName}
          </DialogTitle>

          <DialogDescription>
            Provide your feedback and rating for the volunteer.
          </DialogDescription>
        </DialogHeader>

        {/* ⭐ Rating UI */}
        <div className="space-y-4 pt-2">
          {/* Moved onMouseLeave to the parent container to prevent flickering when moving between stars */}
          <div 
            className="flex items-center justify-center gap-2"
            onMouseLeave={() => setHoveredStar(0)}
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const starValue = i + 1;

              return (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setHoveredStar(starValue)}
                  onClick={() => setRating(starValue)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={cn(
                      'h-8 w-8 transition-colors',
                      starValue <= displayRating
                        ? 'fill-primary text-primary'
                        : 'text-muted-foreground/30'
                    )}
                  />
                </button>
              );
            })}
          </div>

          <p className="text-center text-sm font-medium text-muted-foreground min-h-[20px]">
            {displayRating === 0 && 'Select a rating'}
            {displayRating === 1 && 'Poor'}
            {displayRating === 2 && 'Fair'}
            {displayRating === 3 && 'Good'}
            {displayRating === 4 && 'Very Good'}
            {displayRating === 5 && 'Excellent'}
          </p>

          <Textarea
            placeholder="Optional feedback..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="resize-none"
          />

          <Button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="w-full"
          >
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}