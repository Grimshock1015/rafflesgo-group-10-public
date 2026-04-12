import { useState } from 'react'
import type { TutorialStep } from '../constants/tutorialSteps'

type TutorialModalProps = {
  steps: TutorialStep[]
  onFinish: () => void
}

export default function TutorialModal({ steps, onFinish }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const isLastStep = currentStep === steps.length - 1
  const step = steps[currentStep]

  const handleNext = () => {
    if (isLastStep) {
      onFinish()
      return
    }

    setCurrentStep((prev) => prev + 1)
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button onClick={onFinish} style={skipButtonStyle}>
          Skip
        </button>

        <h2 style={titleStyle}>{step.title}</h2>
        <p style={descriptionStyle}>{step.description}</p>
        {step.image && (
            <img
                src={step.image}
                alt={step.title}
                style={imageStyle}
            />
        )}

        <div style={controlsRowStyle}>
            <button
                onClick={handleBack}
                disabled={currentStep === 0}
                style={{
                ...secondaryButtonStyle,
                opacity: currentStep === 0 ? 0.5 : 1,
                cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                }}
            >
                Back
            </button>

            <div style={dotsContainerStyle}>
                {steps.map((_, index) => (
                <span
                    key={index}
                    style={{
                    ...dotStyle,
                    opacity: index === currentStep ? 1 : 0.3,
                    }}
                />
                ))}
            </div>

            <button onClick={handleNext} style={primaryButtonStyle}>
                {isLastStep ? 'Get Started' : 'Next'}
            </button>
        </div>
      </div>
    </div>
  )
}

const imageStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '240px',
  height: 'auto',
  display: 'block',
  margin: '0 auto 1.5rem auto',
  borderRadius: '12px',
  objectFit: 'cover',
}

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: '#14532d',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '0.75rem 1.25rem',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
}

const secondaryButtonStyle: React.CSSProperties = {
  backgroundColor: '#f3f4f6',
  color: '#1f2937',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  padding: '0.75rem 1.25rem',
  fontSize: '1rem',
  fontWeight: 600,
}

const titleStyle: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '2rem',
  fontWeight: 700,
  marginBottom: '1rem',
}

const descriptionStyle: React.CSSProperties = {
  color: '#4b5563',
  fontSize: '1rem',
  lineHeight: 1.6,
  marginBottom: '1.5rem',
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
}

const modalStyle: React.CSSProperties = {
  position: 'relative',
  backgroundColor: 'white',
  padding: '2rem',
  borderRadius: '12px',
  width: '90%',
  maxWidth: '500px',
  minHeight: '250px',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
}

const skipButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '1rem',
  right: '1rem',
}

const dotsContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '8px',
}

const dotStyle: React.CSSProperties = {
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  backgroundColor: 'black',
}

const controlsRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: '2rem',
}