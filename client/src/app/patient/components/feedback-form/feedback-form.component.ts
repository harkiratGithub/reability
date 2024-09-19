import { Component, Inject, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ModalComponent } from 'src/app/common/modal/modal.component';
import { FeedbackQuestion } from 'src/types';
import { feedbackQuestions } from '../../utils/utils';
import { AjaxService } from 'src/app/therapist/services/ajax.service';

@Component({
  selector: 'app-feedback-form',
  templateUrl: './feedback-form.component.html',
  styleUrls: ['./feedback-form.component.scss'],
})
export class FeedbackFormComponent implements OnInit {
  @Input() isTherapist = false;
  @Input() isInSplitScreen = false;
  @Input() peerId;
  questions: FeedbackQuestion[] = [];
  currentIndex = 0;
  answers: { [id: number]: string } = {};

  constructor(public dialogRef: MatDialogRef<FeedbackFormComponent>, private ajax: AjaxService) {}
  ngOnInit(): void {
    this.questions = this.getRandomQuestions(feedbackQuestions, 5);
  }
  getRandomQuestions(questions: FeedbackQuestion[], num: number): FeedbackQuestion[] {
    const shuffledQuestions = questions.map((q) => ({ ...q })).sort(() => 0.5 - Math.random());
    return shuffledQuestions.slice(0, num);
  }

  get currentQuestion(): FeedbackQuestion {
    return this.questions[this.currentIndex];
  }

  nextQuestion(): void {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
    }
  }

  prevQuestion(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  skipQuestion(): void {
    this.answers[this.currentQuestion.id] = 'skipped'; 
    this.nextQuestion();
  }


  submitFeedback(): void {
    const feedbackData = {
      questions: this.questions.map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        answer: this.answers[q.id] || '',
      })),
    };
    this.saveFeedback(feedbackData);
  }

  saveFeedback(feedbackData: any): void {
    this.ajax.updateGameFeedback(feedbackData).subscribe(() => {});
    this.closeDialog();
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
