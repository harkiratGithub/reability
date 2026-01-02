import { Component, OnInit, ViewChild } from '@angular/core';
import { AjaxAdmin } from 'src/app/common/services/ajax_admin.service';
import { IGameData } from 'src/types';
import _ from 'lodash';

@Component({
  selector: 'app-file-uploader',
  templateUrl: './file-uploader.component.html',
  styleUrls: ['./file-uploader.component.scss'],
})
export class FileUploaderComponent implements OnInit {
  @ViewChild('fileInput') fileInput: any;
  @ViewChild('imageInput') imageInput: any;
  @ViewChild('passwordRef') passwordRef: any;
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
    event.stopPropagation();
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer?.items) {
      this.handleDataTransferItems(event.dataTransfer.items, false);
    } else if (event.dataTransfer?.files) {
      this.processFiles(event.dataTransfer.files, false);
    }
  }

  onImageDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer?.items) {
      this.handleDataTransferItems(event.dataTransfer.items, true);
    } else if (event.dataTransfer?.files) {
      this.processFiles(event.dataTransfer.files, true);
    }
  }

  async handleDataTransferItems(items: DataTransferItemList, isImage: boolean): Promise<void> {
    const files: Array<{ file: File; relativePath: string }> = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          await this.traverseFileTree(entry, '', files);
        }
      }
    }
    
    if (!isImage) {
      this.files = [];
      this.errorFiles = [];
      this.filesCounter = 0;
      this.allGameData = [];
      this.showMsg = false;
      this.errorMsg = false;
      
      files.forEach(fileObj => {
        this.files.push({ relativePath: fileObj.relativePath, file: fileObj.file });
      });
    }
    
    for (const fileObj of files) {
      await this.processFile(fileObj.file, fileObj.relativePath, isImage);
    }
  }

  async traverseFileTree(item: any, path: string, files: Array<{ file: File; relativePath: string }>): Promise<void> {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file: File) => {
          const relativePath = path + file.name;
          files.push({ file, relativePath });
          resolve();
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        dirReader.readEntries(async (entries: any[]) => {
          for (const entry of entries) {
            await this.traverseFileTree(entry, path + item.name + '/', files);
          }
          resolve();
        });
      }
    });
  }

  async processFile(file: File, relativePath: string, isImage: boolean): Promise<void> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        if (isImage) {
          const base64String = e.target.result;
          this.sendImageToServer(base64String, relativePath);
        } else {
          try {
            const jsonData = JSON.parse(e.target.result);
            this.addJson(relativePath, { data: jsonData });
          } catch {
            this.errorFiles.push(relativePath);
            this.errorMsg = true;
            this.showMsg = false;
            this.message = 'Files upload failed - these are invalid:';
          }
        }
        resolve();
      };
      
      if (isImage) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
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

  processFiles(fileList: FileList, isImage: boolean): void {
    const filesArray = Array.from(fileList);
    
    if (!isImage) {
      // Clear previous files and errors
      this.files = [];
      this.errorFiles = [];
      this.filesCounter = 0;
      this.allGameData = [];
      this.showMsg = false;
      this.errorMsg = false;
      
      // Store files for display with relative path
      filesArray.forEach(file => {
        // Use webkitRelativePath if available (for directory upload), otherwise use name
        const relativePath = (file as any).webkitRelativePath || file.name;
        this.files.push({ relativePath: relativePath, file: file });
      });
    }

    filesArray.forEach((file) => {
      const reader = new FileReader();
      const relativePath = (file as any).webkitRelativePath || file.name;
      
      reader.onload = (e: any) => {
        if (isImage) {
          const base64String = e.target.result;
          this.sendImageToServer(base64String, relativePath);
        } else {
          try {
            const jsonData = JSON.parse(e.target.result);
            this.addJson(relativePath, { data: jsonData });
          } catch {
            this.errorFiles.push(relativePath);
            this.errorMsg = true;
            this.showMsg = false;
            this.message = 'Files upload failed - these are invalid:';
          }
        }
      };
      
      if (isImage) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
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
      const data = await this.ajaxAdmin.uploadGameRelatedImage(base64File, fileName).toPromise();
      if (data) {
        const imageUrl = data.url ? data.url : data.fileURL;
        this.imageUrls.push({ imageName: data.name, url: imageUrl });
      }
    } catch (error) {
      console.error('Image upload failed', error);
    }
  }

  addJson(fileName: string, jsonData: any) {
    const [firstAnswer, secondAnswer] = _.remove(jsonData.data, (item: any) => {
      if (item.length) {
        return item;
      }
    });
    const unitedTargetAnswers: any[] = _.union(firstAnswer, secondAnswer);
    
    if (unitedTargetAnswers?.length) {
      const editableTextboxIds = [];
      for (let item of unitedTargetAnswers) {
        if (item.value != 'click') {
          editableTextboxIds.push(item.id);
        }
      }
      jsonData.data = jsonData.data.filter((item) => {
        if (item.d) {
          return (
            !(editableTextboxIds.includes(item.d[0]) && item.t == 'setTextboxText') && item.t != 'setTextboxBorder'
          );
        }
      });
    } else {
      for (let item of jsonData.data) {
        item.ans = 'NO_ANS';
      }
    }
    
    this.addNewGameData(fileName, JSON.stringify(jsonData), JSON.stringify({ target_answer: unitedTargetAnswers }));
  }

  addNewGameData(fileName: string, data: any, targetAnswer: any) {
    let firstTag;
    let worksheet;
    let otherTags = [];
    let str = fileName.split('.json')[0];
    str = str.toLowerCase();
    const backSlash = String.fromCharCode(92);
    
    if (str.includes('/')) {
      firstTag = str.split('/')[1];
      otherTags = str.split('/');
    } else {
      firstTag = str.split(backSlash)[1];
      otherTags = str.split(backSlash);
    }
    
    worksheet = otherTags[otherTags.length - 1];
    otherTags = otherTags.slice(2, -1);
    
    let currentGameData = {
      gameId: this.gameId,
      worksheet: worksheet,
      tags: {},
      data: data,
      active: true,
      target_answer: targetAnswer,
    };
    
    this.allGameData.push(currentGameData);
    currentGameData.tags[firstTag] = [...otherTags];
    this.filesCounter++;
    
    if (this.filesCounter == this.files.length) {
      for (let gameData of this.allGameData) {
        gameData.tags = JSON.stringify(gameData.tags);
      }
      this.createGameData();
      this.allGameData = [];
      this.filesCounter = 0;
    }
  }

  createGameData() {
    this.ajaxAdmin.createGameData(this.allGameData).subscribe((res) => {
      if (res.length) {
        this.message = 'Files uploaded successfully';
        this.showMsg = true;
        this.errorMsg = false;
      }
    });
  }

  clearGameDataTable() {
    this.ajaxAdmin.clearGameDataTable().subscribe((data) => {
      if (!data.length) {
        this.databaseMsg = 'Deleted successfully';
        this.passwordRef.nativeElement.value = '';
        this.passwordMsg = '';
      }
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
      const whiteboardGame = allGames.filter((item) => {
        return item.name == 'whiteboard';
      });
      this.gameId = whiteboardGame[0].id;
    });
  }
}