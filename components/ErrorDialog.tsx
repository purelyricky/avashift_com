// components/ErrorDialog.tsx
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
  } from "@/components/ui/dialog";
  import { Button } from "@/components/ui/button";
  import { XCircle } from "lucide-react";
  
  interface ErrorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    error: string;
    style?: React.CSSProperties;
  }
  
  export function ErrorDialog({ isOpen, onClose, error, style }: ErrorDialogProps) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent style={style}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Assignment Error
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-base text-gray-700">{error}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
