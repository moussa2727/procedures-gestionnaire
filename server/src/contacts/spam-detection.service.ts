// modules/contacts/spam-detection.service.ts
import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';

const SUSPICIOUS_KEYWORDS = [
  'viagra',
  'crypto airdrop',
  'casino',
  'seo backlink',
  'loan approved',
  'work from home',
];

const MAX_LINKS = 2;

@Injectable()
export class SpamDetectionService {
  isSpam(dto: CreateContactDto): boolean {
    // Do not automatically flag messages as spam just because a website is provided.
    // Many legitimate contacts include a website; instead rely on content checks.
    const content = ` ${dto.message || ''}`.toLowerCase();

    // Match suspicious keywords with word boundaries to avoid accidental substring matches
    if (
      SUSPICIOUS_KEYWORDS.some((keyword) => {
        const k = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`\\b${k}\\b`, 'i');
        return re.test(content);
      })
    ) {
      return true;
    }

    const linkCount = (content.match(/https?:\/\//g) ?? []).length;
    if (linkCount > MAX_LINKS) {
      return true;
    }

    if (this.hasExcessiveRepetition(dto.message)) {
      return true;
    }

    return false;
  }

  private hasExcessiveRepetition(message: string): boolean {
    const words = message.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length < 8) return false;

    const uniqueRatio = new Set(words).size / words.length;
    return uniqueRatio < 0.3;
  }
}
