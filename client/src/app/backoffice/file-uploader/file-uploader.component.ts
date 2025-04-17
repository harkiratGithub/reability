import { Component, OnInit, ViewChild } from '@angular/core';
import { AjaxAdmin } from 'src/app/common/services/ajax_admin.service';
import { IGameData } from 'src/types';
import { union } from 'lodash';

@Component({
  selector: 'app-file-uploader',
  templateUrl: './file-uploader.component.html',
  styleUrls: ['./file-uploader.component.scss'],
})
export class FileUploaderComponent implements OnInit {
  @ViewChild('fileInput') fileInput: any;
  @ViewChild('imageInput') imageInput: any;
  public files: any[] = [];
  public images: any[] = [];
  public showMsg = false;
  public errorMsg = false;
  public isPasswordCorrect = false;
  public gameId!: number;
  public filesCounter = 0;
  public message = '';
  public passwordMsg = '';
  public databaseMsg = '';
  public allGameData: IGameData[] = [];
  public imageUrls: { imageName: string; url: string }[] = [];
  public errorFiles: string[] = [];

  constructor(private ajaxAdmin: AjaxAdmin) {}

  ngOnInit(): void {
    this.getGameId();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      this.processFiles(event.dataTransfer.files, false);
    }
  }

  onImageDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      this.processFiles(event.dataTransfer.files, true);
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(input.files, false);
    }
  }

  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(input.files, true);
    }
  }
  processFiles(files: FileList, isImage: boolean): void {
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        if (isImage) {
          // Convert the file to Base64 and send it to the server
          //const base64String = e.target.result.split(',')[1]; // Remove metadata part
          const base64String = e.target.result;
          this.sendImageToServer(base64String, file.name);
        } else {
          try {
            const jsonData = JSON.parse(e.target.result);
            this.addJson(file.name, { data: jsonData });
          } catch {
            this.errorFiles.push(file.name);
            this.errorMsg = true;
            this.showMsg = false;
            this.message = `Files upload failed - these are invalid:`;
          }
        }
      };
      reader.readAsDataURL(file); // Read the file as a DataURL (Base64 string)
    });
  }
  
  browseFiles(): void {
    this.fileInput.nativeElement.click();
  }
  
  browseImages(): void {
    this.imageInput.nativeElement.click();
  }
  
  async sendImageToServer(base64File: string, fileName: string) {
    try {  
      const data = await this.ajaxAdmin.uploadGameRelatedImage(base64File,fileName).toPromise();
      if (data) {
        this.imageUrls.push({ imageName: data.name, url: data.url });
      }
     // console.log("uploaded image ",this.imageUrls);
    } catch (error) {
      console.error('Image upload failed', error);
    }
  }
  addJson(fileName: string, jsonData: any) {
    const unitedTargetAnswers = union(...jsonData.data.map((item: any) => item));
    const editableTextboxIds = unitedTargetAnswers
      .filter((item: any) => item.value !== 'click')
      .map((item: any) => item.id);
  
    jsonData.data = jsonData.data.filter(
      (item: any) =>
        !(editableTextboxIds.includes(item?.d?.[0]) && item.t === 'setTextboxText') && item.t !== 'setTextboxBorder'
    );
  
    this.addNewGameData(fileName, JSON.stringify(jsonData), JSON.stringify({ target_answer: unitedTargetAnswers }));
  }

  addNewGameData(fileName: string, data: any, targetAnswer: any) {
    const worksheet = fileName.split('.json')[0];
    const currentGameData = {
      gameId: this.gameId,
      worksheet,
      tags: {},
      data,
      active: true,
      target_answer: targetAnswer,
    };

    this.allGameData.push(currentGameData);

    this.filesCounter++;
    if (this.filesCounter === this.files.length) {
      this.createGameData();
    }
  }

  createGameData() {
    this.ajaxAdmin.createGameData(this.allGameData).subscribe(() => {
      this.message = 'Files uploaded successfully';
      this.showMsg = true;
      this.errorMsg = false;
    });
  }

  clearGameDataTable() {
    this.ajaxAdmin.clearGameDataTable().subscribe(() => {
      this.databaseMsg = 'Deleted successfully';
    });
  }

  checkPassword(password: string) {
    this.ajaxAdmin.checkPassword(password).subscribe((res) => {
      this.isPasswordCorrect = res.passwordCorrect;
      this.passwordMsg = this.isPasswordCorrect ? 'OK!' : 'Incorrect Password!';
    });
  }

  getGameId() {
    this.ajaxAdmin.getAllGames().subscribe((allGames) => {
      const whiteboardGame = allGames.find((item) => item?.name === 'whiteboard');
      this.gameId = whiteboardGame?.id ?? 0;
    });
  }
}
