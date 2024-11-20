import { Component, OnInit, ViewChild } from '@angular/core';
import { AjaxAdmin } from 'src/app/common/services/ajax_admin.service';
import { IGameData } from 'src/types';
import { NgxFileDropEntry, FileSystemFileEntry } from 'ngx-file-drop';
import _ from 'lodash';
@Component({
  selector: 'app-file-uploader',
  templateUrl: './file-uploader.component.html',
  styleUrls: ['./file-uploader.component.scss'],
})
export class FileUploaderComponent implements OnInit {
  @ViewChild('passwordRef') passwordRef: any;
  public fileUploader: boolean = false;
  public files: NgxFileDropEntry[] = [];
  public images: NgxFileDropEntry[] = [];
  public showMsg: boolean = false;
  public errorMsg: boolean = false;
  public isPasswordCorrect: boolean = false;
  public gameId: number;
  public filesCounter: number = 0;
  public message: string;
  public passwordMsg: string;
  public databaseMsg: string;
  public allGameData: IGameData[] = [];
  public imageUrls: any[] = [];
  public errorFiles: string[] = [];

  constructor(private ajaxAdmin: AjaxAdmin) {}

  ngOnInit(): void {
    this.getGameId();
  }

  dropped(files: NgxFileDropEntry[]) {
    this.files = files;
    for (const droppedFile of files) {
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file(async (file: File) => {
          var reader = new FileReader();
          reader.onload = (e: any) => {
            try {
              const jsonData = JSON.parse(e.target.result);
              this.addJson(droppedFile.relativePath, { data: jsonData });
            } catch (e) {
              this.errorFiles.push(droppedFile.relativePath);
              this.showMsg = false;
              this.errorMsg = true;
              this.message = `Files upload failed - these are invalid:`;
            }
          };
          reader.readAsText(file);
        });
      }
    }
  }

  droppedImages(images: NgxFileDropEntry[]) {
    this.images = images;
    for (const droppedFile of images) {
      const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
      fileEntry.file(async (file: File) => {
        var reader = new window.FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = (e: any) => {
          try {
            this.sendImageToServer(reader.result, droppedFile.relativePath);
          } catch (error) {
            console.log(error);
          }
        };
      });
    }
  }

  sendImageToServer = async (file: any, fileName: string) => {
    await this.ajaxAdmin
      .uploadGameRelatedImage(file, fileName)
      .toPromise()
      .then((data) => {
        if (data) {
          this.imageUrls.push({ imageName: data.name, url: data.url });
        }
      });
  };

  addNewGameData = (fileName: string, data: any, targetAnswer: any) => {
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
  };

  createGameData() {
    this.ajaxAdmin.createGameData(this.allGameData).subscribe((res) => {
      if (res.length) {
        this.message = 'Files uploaded successfully';
        this.showMsg = true;
        this.errorMsg = false;
      }
    });
  }

  addJson = (fileName: string, jsonData: any) => {
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
  };

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
        return item?.name == 'whiteboard';
      });
      this.gameId = whiteboardGame[0]?.id;
    });
  }
}
