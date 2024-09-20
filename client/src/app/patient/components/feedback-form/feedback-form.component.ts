import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FeedbackQuestion } from 'src/types';
import { feedbackQuestions } from '../../utils/utils';
import { AjaxService } from 'src/app/therapist/services/ajax.service';

@Component({
  selector: 'app-feedback-form',
  templateUrl: './feedback-form.component.html',
  styleUrls: ['./feedback-form.component.scss'],
})
export class FeedbackFormComponent implements OnInit {
  currentIndex = 0;
  hoverValue: number = 0;
  questions: FeedbackQuestion[] = [];
  answers: { [key: number]: number | 'skipped' | null } = {};
  ratingValue: number | null = null;

  constructor(public dialogRef: MatDialogRef<FeedbackFormComponent>, private ajax: AjaxService) {}

  ngOnInit(): void {
    const nonRatingQuestions = feedbackQuestions.filter((q) => q.questionType !== 'rating');
    this.questions = this.getRandomQuestions(nonRatingQuestions, 4);
    const ratingQuestion = feedbackQuestions.find((q) => q.questionType === 'rating');
    if (ratingQuestion) {
      this.questions.push(ratingQuestion);
    }
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
  selectRating(value: number): void {
    this.answers[this.currentQuestion.id] = value;
    this.hoverValue = null;
  }

  skipQuestion(): void {
    this.answers[this.currentQuestion.id] = null;
    if (this.currentIndex === this.questions.length - 1 && this.currentQuestion.questionType === 'rating') {
      this.submitFeedback();
      this.closeDialog();
    } else {
      this.nextQuestion();
    }
  }

  submitFeedback(): void {
    const feedbackData = {
      questions: this.questions?.map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        questionType: q.questionType,
        answer: this.answers[q.id] || 'skipped',
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


  isFormValid(): boolean {
    return this.questions.every((q) => {
      const answer = this.answers[q.id];
      if (q.questionType === 'rating') {
        return typeof answer === 'number' && answer !== null;
      }
      return answer !== null && (typeof answer === 'number' || answer === 'skipped');
    });
  }
  
  
}
