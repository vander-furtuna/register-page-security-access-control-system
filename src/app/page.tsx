"use client";

import React, { useState, useEffect } from "react";
import { Input, Button, Card, CardBody, CardHeader, Chip, RadioGroup, Radio } from "@heroui/react";
import { database } from "@/app/firebase";
import { ref, set, onValue, remove, off } from "firebase/database";
import Image from "next/image";

type RegistrationMode = "CARD_AND_FINGER" | "CARD_ONLY" | "FINGER_ONLY";

export default function Home() {
  const [systemMode, setSystemMode] = useState<string>("STANDBY"); // "STANDBY" | "MASTER"
  const [selectedMode, setSelectedMode] = useState<RegistrationMode>("CARD_AND_FINGER");
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [pending, setPending] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);
  const [completedName, setCompletedName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  
  const TIMER_SECONDS = 120;
  const [timer, setTimer] = useState<number>(TIMER_SECONDS);

  // 1. Escuta o estado da Fechadura Física em tempo real (/system/mode)
  useEffect(() => {
    const modeRef = ref(database, "system/mode");
    onValue(modeRef, (snapshot) => {
      if (snapshot.exists()) {
        const mode = snapshot.val();
        setSystemMode(mode);
      } else {
        setSystemMode("STANDBY");
      }
    });

    return () => {
      off(modeRef);
    };
  }, []);

  // 2. Escuta cadastros pendentes em tempo real (/pendingRegistration/current)
  useEffect(() => {
    const pendingRef = ref(database, "pendingRegistration/current");
    onValue(pendingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setPending(true);
        if (data.username) setUsername(data.username);
        if (data.email) setEmail(data.email);
        if (data.mode) setSelectedMode(data.mode);
        setTimer(TIMER_SECONDS);
      } else {
        // Se estava pendente e foi removido pelo ESP32, significa conclusão com sucesso!
        if (pending) {
          setCompleted(true);
          setCompletedName(username);
          setPending(false);
          setUsername("");
          setEmail("");
        }
      }
    });

    return () => {
      off(pendingRef);
    };
  }, [pending, username]);

  // 3. Temporizador de expiração de cadastro pendente
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pending && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (pending && timer === 0) {
      cancelPendingRegistration();
    }
    return () => clearInterval(interval);
  }, [pending, timer]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Cancela ou limpa cadastros pendentes
  const cancelPendingRegistration = async () => {
    try {
      await remove(ref(database, "pendingRegistration/current"));
      await remove(ref(database, "pendingUser/current"));
      setPending(false);
      setTimer(TIMER_SECONDS);
    } catch (err) {
      setError(`Erro ao cancelar cadastro: ${err}`);
    }
  };

  // Submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCompleted(false);

    if (systemMode !== "MASTER") {
      setError("A fechadura precisa estar no Modo de Cadastro! Aproxime o Cartão Mestre na fechadura física primeiro.");
      return;
    }

    if (!username.trim() || !email.trim()) {
      setError("Por favor, preencha nome e e-mail.");
      return;
    }

    setLoading(true);

    const payload = {
      username: username.trim(),
      email: email.trim(),
      mode: selectedMode,
      timestamp: new Date().toISOString(),
    };

    try {
      await set(ref(database, "pendingRegistration/current"), payload);
      // Espelho para compatibilidade
      await set(ref(database, "pendingUser/current"), {
        username: payload.username,
        email: payload.email,
        timestamp: payload.timestamp,
      });

      setPending(true);
      setLoading(false);
    } catch (err) {
      setError(`Erro ao iniciar cadastro: ${err}`);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 py-8">
      {/* Cabeçalho */}
      <div className="flex flex-col items-center gap-2 mb-6">
        <Image
          src="/logo-pet-flat-escuro.svg"
          alt="Logo do PET"
          width={180}
          height={60}
          priority
        />
        <h1 className="text-xl md:text-2xl font-bold text-slate-800 text-center">
          Controle de Acesso Inteligente
        </h1>
        <p className="text-sm text-slate-600 text-center max-w-md">
          Portal de Cadastro de Usuários do Laboratório PET
        </p>
      </div>

      {/* Card de Status da Fechadura Física */}
      <div className="w-full max-w-md mb-4">
        {systemMode === "MASTER" ? (
          <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 flex items-center justify-between shadow-sm animate-pulse">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <div>
                <p className="text-emerald-900 font-bold text-sm">Modo de Cadastro ATIVO</p>
                <p className="text-emerald-700 text-xs">Fechadura física pronta para registrar</p>
              </div>
            </div>
            <Chip color="success" variant="flat" size="sm">Pronto</Chip>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <div>
                <p className="text-amber-900 font-semibold text-sm">Fechadura em Espera</p>
                <p className="text-amber-700 text-xs">Aproxime o Cartão Mestre na fechadura para liberar</p>
              </div>
            </div>
            <Chip color="warning" variant="flat" size="sm">Aguardando</Chip>
          </div>
        )}
      </div>

      {/* Feedback de Sucesso */}
      {completed && (
        <Card className="w-full max-w-md mb-4 bg-emerald-50 border border-emerald-300">
          <CardBody className="flex flex-col items-center text-center p-6 gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center text-2xl font-bold">
              ✓
            </div>
            <h2 className="text-lg font-bold text-emerald-900">Cadastro Concluído com Sucesso!</h2>
            <p className="text-sm text-emerald-700">
              O usuário <strong>{completedName}</strong> foi registrado e já pode utilizar a fechadura física.
            </p>
            <Button
              color="success"
              variant="flat"
              onPress={() => setCompleted(false)}
              className="mt-2"
            >
              Cadastrar Outro Usuário
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Formulário Principal */}
      <Card className="w-full max-w-md shadow-lg border border-slate-200">
        <CardHeader className="flex flex-col items-start px-6 pt-6 pb-2">
          <h2 className="text-lg font-bold text-slate-800">Novo Cadastro</h2>
          <p className="text-xs text-slate-500">
            Preencha os dados e escolha o método de autenticação desejado.
          </p>
        </CardHeader>

        <CardBody className="px-6 pb-6 pt-2">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              isRequired
              label="Nome Completo"
              placeholder="Digite o nome do usuário"
              value={username}
              onValueChange={setUsername}
              isDisabled={pending || systemMode !== "MASTER"}
              variant="bordered"
              labelPlacement="outside"
            />

            <Input
              isRequired
              label="E-mail"
              type="email"
              placeholder="usuario@ufc.br"
              value={email}
              onValueChange={setEmail}
              isDisabled={pending || systemMode !== "MASTER"}
              variant="bordered"
              labelPlacement="outside"
            />

            {/* Seleção dos 3 Modos de Cadastro */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">
                Opção de Autenticação:
              </label>
              <RadioGroup
                value={selectedMode}
                onValueChange={(val) => setSelectedMode(val as RegistrationMode)}
                isDisabled={pending || systemMode !== "MASTER"}
                classNames={{ base: "gap-3" }}
              >
                <Radio
                  value="CARD_AND_FINGER"
                  description="Aproxime o cartão e faça a leitura biométrica (Mais seguro)"
                  classNames={{
                    base: "border border-slate-200 rounded-lg p-3 hover:bg-slate-50 data-[selected=true]:border-primary data-[selected=true]:bg-primary-50",
                    label: "font-semibold text-slate-800",
                    description: "text-xs text-slate-500",
                  }}
                >
                  🔐 Cartão RFID + Digital (Completo)
                </Radio>

                <Radio
                  value="CARD_ONLY"
                  description="Apenas aproximação de tag ou cartão RFID"
                  classNames={{
                    base: "border border-slate-200 rounded-lg p-3 hover:bg-slate-50 data-[selected=true]:border-primary data-[selected=true]:bg-primary-50",
                    label: "font-semibold text-slate-800",
                    description: "text-xs text-slate-500",
                  }}
                >
                  💳 Apenas Cartão RFID
                </Radio>

                <Radio
                  value="FINGER_ONLY"
                  description="Apenas leitura da impressão digital no sensor DY50"
                  classNames={{
                    base: "border border-slate-200 rounded-lg p-3 hover:bg-slate-50 data-[selected=true]:border-primary data-[selected=true]:bg-primary-50",
                    label: "font-semibold text-slate-800",
                    description: "text-xs text-slate-500",
                  }}
                >
                  👆 Apenas Digital (Biometria)
                </Radio>
              </RadioGroup>
            </div>

            {/* Erros */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-700">
                {error}
              </div>
            )}

            {/* Botão de Envio */}
            {!pending ? (
              <Button
                type="submit"
                color="primary"
                isLoading={loading}
                isDisabled={systemMode !== "MASTER"}
                className="w-full font-bold shadow-md"
              >
                {systemMode === "MASTER"
                  ? "Iniciar Cadastro na Fechadura"
                  : "Aguardando Modo Mestre..."}
              </Button>
            ) : (
              <div className="bg-blue-50 border border-blue-300 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="animate-spin text-blue-600 font-bold">↻</span>
                    <h3 className="text-blue-900 font-bold text-sm">Siga os passos na fechadura:</h3>
                  </div>
                  <Chip color="primary" variant="flat" size="sm">
                    {formatTime(timer)}
                  </Chip>
                </div>

                {selectedMode === "CARD_AND_FINGER" && (
                  <ol className="text-xs text-blue-800 list-decimal list-inside flex flex-col gap-1.5 pl-1">
                    <li>Aproxime o <strong>Cartão RFID</strong> no leitor.</li>
                    <li>Encoste o <strong>dedo</strong> no sensor biométrico até o bipe.</li>
                    <li>Retire e encoste o mesmo dedo novamente para confirmar.</li>
                  </ol>
                )}

                {selectedMode === "CARD_ONLY" && (
                  <ol className="text-xs text-blue-800 list-decimal list-inside flex flex-col gap-1.5 pl-1">
                    <li>Aproxime o <strong>Cartão RFID</strong> no leitor.</li>
                    <li>Aguarde a confirmação na tela da fechadura.</li>
                  </ol>
                )}

                {selectedMode === "FINGER_ONLY" && (
                  <ol className="text-xs text-blue-800 list-decimal list-inside flex flex-col gap-1.5 pl-1">
                    <li>Encoste o <strong>dedo</strong> no sensor biométrico.</li>
                    <li>Retire o dedo quando indicado.</li>
                    <li>Encoste o mesmo dedo novamente para confirmar.</li>
                  </ol>
                )}

                <Button
                  size="sm"
                  color="danger"
                  variant="flat"
                  onPress={cancelPendingRegistration}
                  className="mt-1"
                >
                  Cancelar Cadastro
                </Button>
              </div>
            )}
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
