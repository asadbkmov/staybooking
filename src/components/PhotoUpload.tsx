import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface PhotoUploadProps {
  bucketName: "hotel-photos" | "room-photos";
  folder: string; // hotel-id or room-id
  existingPhotos?: string[];
  onPhotosUpdate: (photos: string[]) => void;
  maxPhotos?: number;
}

export function PhotoUpload({ 
  bucketName, 
  folder, 
  existingPhotos = [], 
  onPhotosUpdate, 
  maxPhotos = 10 
}: PhotoUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>(existingPhotos);

  const uploadPhoto = async (file: File) => {
    const fileName = `${folder}/${Date.now()}-${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (photos.length + files.length > maxPhotos) {
      toast({
        title: "Слишком много фотографий",
        description: `Максимум ${maxPhotos} фотографий`,
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    
    try {
      const uploadPromises = files.map(uploadPhoto);
      const newPhotoUrls = await Promise.all(uploadPromises);
      const updatedPhotos = [...photos, ...newPhotoUrls];
      
      setPhotos(updatedPhotos);
      onPhotosUpdate(updatedPhotos);
      
      toast({
        title: "Фотографии загружены",
        description: `Загружено ${files.length} фотографий`
      });
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = "";
    }
  };

  const removePhoto = async (photoUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = photoUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${folder}/${fileName}`;
      
      await supabase.storage
        .from(bucketName)
        .remove([filePath]);
      
      const updatedPhotos = photos.filter(url => url !== photoUrl);
      setPhotos(updatedPhotos);
      onPhotosUpdate(updatedPhotos);
      
      toast({
        title: "Фотография удалена"
      });
    } catch (error: any) {
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Фотографии ({photos.length}/{maxPhotos})</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading || photos.length >= maxPhotos}
          onClick={() => document.getElementById(`photo-upload-${folder}`)?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Загрузка..." : "Добавить фото"}
        </Button>
      </div>
      
      <input
        id={`photo-upload-${folder}`}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <div key={index} className="relative group">
              <img
                src={photo}
                alt={`Фото ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removePhoto(photo)}
                className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Нет загруженных фотографий</p>
          <p className="text-sm text-muted-foreground mt-1">
            Нажмите "Добавить фото" для загрузки изображений
          </p>
        </div>
      )}
    </div>
  );
}