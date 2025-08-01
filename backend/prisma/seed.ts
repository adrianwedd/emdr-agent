import { PrismaClient } from '@prisma/client';
import { logger } from '../src/utils/logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('Starting database seeding...');

  // Create sample grounding techniques
  const groundingTechniques = [
    {
      id: '1',
      name: '5-4-3-2-1 Technique',
      description: 'Name 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste.',
      category: 'sensory',
      difficulty: 'easy',
      duration: 5,
      instructions: [
        'Look around and name 5 things you can see',
        'Name 4 things you can touch or feel',
        'Listen and name 3 things you can hear',
        'Name 2 things you can smell',
        'Name 1 thing you can taste'
      ]
    },
    {
      id: '2',
      name: 'Deep Breathing',
      description: 'Focus on slow, deep breathing to calm the nervous system.',
      category: 'breathing',
      difficulty: 'easy',
      duration: 3,
      instructions: [
        'Sit or stand comfortably',
        'Breathe in slowly through your nose for 4 counts',
        'Hold your breath for 4 counts',
        'Exhale slowly through your mouth for 6 counts',
        'Repeat for 2-3 minutes'
      ]
    },
    {
      id: '3',
      name: 'Progressive Muscle Relaxation',
      description: 'Systematically tense and relax different muscle groups.',
      category: 'physical',
      difficulty: 'medium',
      duration: 10,
      instructions: [
        'Start with your toes, tense the muscles for 5 seconds',
        'Release and notice the relaxation',
        'Move up to your calves, thighs, and so on',
        'Work your way up through your entire body',
        'End with your facial muscles'
      ]
    }
  ];

  // Create sample crisis resources
  const crisisResources = [
    {
      id: '1',
      name: '988 Suicide & Crisis Lifeline',
      type: 'hotline',
      description: '24/7 free and confidential support for people in distress',
      contactInfo: '988',
      location: 'US',
      availability: '24/7',
      isEmergency: true
    },
    {
      id: '2',
      name: 'Crisis Text Line',
      type: 'text',
      description: 'Free, 24/7 crisis support via text message',
      contactInfo: 'Text HOME to 741741',
      location: 'US',
      availability: '24/7',
      isEmergency: true
    },
    {
      id: '3',
      name: 'NAMI Helpline',
      type: 'helpline',
      description: 'Information, referrals, and support for mental health',
      contactInfo: '1-800-950-6264',
      location: 'US',
      availability: '10am-10pm ET, M-F',
      isEmergency: false
    }
  ];

  logger.info('Seeding complete!');
  logger.info(`- ${groundingTechniques.length} grounding techniques available`);
  logger.info(`- ${crisisResources.length} crisis resources available`);
}

main()
  .catch((e) => {
    logger.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });