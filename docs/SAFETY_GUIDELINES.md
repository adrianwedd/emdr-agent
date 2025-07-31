# Safety Guidelines - Agentic EMDR Therapy App

## ⚠️ Critical Safety Principles

### 1. Not a Medical Device
This application is for research and educational purposes only. It is NOT:
- A replacement for professional therapy
- A medical device or diagnostic tool
- Suitable for treating severe trauma without supervision
- Appropriate for individuals in crisis

### 2. Professional Supervision Recommended
- Initial assessment by qualified EMDR therapist
- Regular supervision during use
- Integration with existing treatment plans
- Professional interpretation of results

### 3. User Safety Protocols

#### Pre-Session Safety Assessment
- Risk assessment questionnaire
- Contraindication screening
- Resource availability check
- Emergency contact verification

#### During Session Monitoring
- Real-time SUD level tracking
- Dissociation detection
- Overwhelm response monitoring
- Automatic safety interventions

#### Post-Session Safety
- Grounding technique completion
- Resource state reinforcement
- Crisis risk assessment
- Follow-up planning

## Safety Features Implementation

### Automatic Safety Triggers

```typescript
// SUD level monitoring
if (sudLevel >= 8) {
  triggerSafetyIntervention('high_distress');
}

// Rapid distress increase
if (sudIncrease >= 3) {
  triggerSafetyIntervention('rapid_escalation');
}

// Dissociation indicators
if (dissociationScore >= 6) {
  triggerSafetyIntervention('dissociation_risk');
}
```

### Emergency Protocols
1. **Immediate Safety Stop**
2. **Grounding Technique Activation**
3. **Crisis Resource Connection**
4. **Professional Notification**
5. **Follow-up Scheduling**

### Contraindications
- Active psychosis
- Severe dissociative disorders
- Substance intoxication
- Acute suicidal ideation
- Unstable medical conditions

## Crisis Intervention

### Crisis Hotlines
- National Suicide Prevention Lifeline: 988
- Crisis Text Line: Text HOME to 741741
- Local emergency services: 911

### Professional Referrals
- Licensed EMDR therapists
- Mental health crisis centers
- Hospital emergency departments
- Psychiatrists and psychologists

## Data Safety and Privacy

### Data Protection
- End-to-end encryption
- Anonymized processing
- HIPAA compliance measures
- Secure data transmission

### User Privacy Rights
- Data access and portability
- Deletion requests
- Consent management
- Third-party sharing controls

## Ethical Guidelines

### Informed Consent
- Clear explanation of limitations
- Risk disclosure
- Alternative treatment options
- Right to discontinue

### Therapeutic Boundaries
- No diagnosis or medical advice  
- Appropriate scope of intervention
- Professional referral recommendations
- Clear limitations communication

## Implementation Checklist

- [ ] Safety assessment integration
- [ ] Crisis intervention protocols
- [ ] Emergency contact systems
- [ ] Professional referral network
- [ ] Data protection measures
- [ ] User consent processes
- [ ] Ethics review completion
- [ ] Legal compliance verification

Remember: When in doubt, prioritize safety and professional consultation.
