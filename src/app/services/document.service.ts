import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface StoredImage {
  id: number;
  filename: string;
  mimetype: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

private http = inject(HttpClient);

uploadFile(file: File, userId: string): Observable<any> {

const formData = new FormData();
// La clé 'file' doit être identique à celle passée dans upload.single('file') côté serveur
formData.append('file', file);

formData.append('userId', userId);

return this.http.post('/api/upload', formData);
}

showFile(): Observable<StoredImage[]> {
  return this.http.get<StoredImage[]>('/api/show');
}

deleteFile(id: number): Observable<unknown> {
  return this.http.post(`/api/delete/${id}`, {});
}

getAvatar(id: number): Observable<StoredImage[]> {
  return this.http.get <StoredImage[]>(`/api/avatar/${id}`, {});
}
}
