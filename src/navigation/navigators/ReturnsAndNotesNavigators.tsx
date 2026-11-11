import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SalesReturnsStackParamList, PurchaseReturnsStackParamList, CreditNotesStackParamList, DebitNotesStackParamList } from '@/types/navigation';

import { SalesReturnsListScreen } from '@/features/returns/sales/screens/SalesReturnsListScreen';
import { SalesReturnDetailScreen } from '@/features/returns/sales/screens/SalesReturnDetailScreen';
import { SalesReturnFormScreen } from '@/features/returns/sales/screens/SalesReturnFormScreen';
import { PurchaseReturnsListScreen } from '@/features/returns/purchase/screens/PurchaseReturnsListScreen';
import { PurchaseReturnDetailScreen } from '@/features/returns/purchase/screens/PurchaseReturnDetailScreen';
import { PurchaseReturnFormScreen } from '@/features/returns/purchase/screens/PurchaseReturnFormScreen';
import { CreditNotesListScreen } from '@/features/finance/credit-notes/screens/CreditNotesListScreen';
import { CreditNoteDetailScreen } from '@/features/finance/credit-notes/screens/CreditNoteDetailScreen';
import { CreditNoteFormScreen } from '@/features/finance/credit-notes/screens/CreditNoteFormScreen';
import { DebitNotesListScreen } from '@/features/finance/debit-notes/screens/DebitNotesListScreen';
import { DebitNoteDetailScreen } from '@/features/finance/debit-notes/screens/DebitNoteDetailScreen';
import { DebitNoteFormScreen } from '@/features/finance/debit-notes/screens/DebitNoteFormScreen';

const SalesReturnsStack = createNativeStackNavigator<SalesReturnsStackParamList>();
export const SalesReturnsStackNavigator: React.FC = () => (
  <SalesReturnsStack.Navigator screenOptions={{ headerShown: false }}>
    <SalesReturnsStack.Screen name="SalesReturnsList" component={SalesReturnsListScreen} />
    <SalesReturnsStack.Screen name="SalesReturnDetail" component={SalesReturnDetailScreen} />
    <SalesReturnsStack.Screen name="SalesReturnForm" component={SalesReturnFormScreen} />
  </SalesReturnsStack.Navigator>
);

const PurchaseReturnsStack = createNativeStackNavigator<PurchaseReturnsStackParamList>();
export const PurchaseReturnsStackNavigator: React.FC = () => (
  <PurchaseReturnsStack.Navigator screenOptions={{ headerShown: false }}>
    <PurchaseReturnsStack.Screen name="PurchaseReturnsList" component={PurchaseReturnsListScreen} />
    <PurchaseReturnsStack.Screen name="PurchaseReturnDetail" component={PurchaseReturnDetailScreen} />
    <PurchaseReturnsStack.Screen name="PurchaseReturnForm" component={PurchaseReturnFormScreen} />
  </PurchaseReturnsStack.Navigator>
);

const CreditNotesStack = createNativeStackNavigator<CreditNotesStackParamList>();
export const CreditNotesStackNavigator: React.FC = () => (
  <CreditNotesStack.Navigator screenOptions={{ headerShown: false }}>
    <CreditNotesStack.Screen name="CreditNotesList" component={CreditNotesListScreen} />
    <CreditNotesStack.Screen name="CreditNoteDetail" component={CreditNoteDetailScreen} />
    <CreditNotesStack.Screen name="CreditNoteForm" component={CreditNoteFormScreen} />
  </CreditNotesStack.Navigator>
);

const DebitNotesStack = createNativeStackNavigator<DebitNotesStackParamList>();
export const DebitNotesStackNavigator: React.FC = () => (
  <DebitNotesStack.Navigator screenOptions={{ headerShown: false }}>
    <DebitNotesStack.Screen name="DebitNotesList" component={DebitNotesListScreen} />
    <DebitNotesStack.Screen name="DebitNoteDetail" component={DebitNoteDetailScreen} />
    <DebitNotesStack.Screen name="DebitNoteForm" component={DebitNoteFormScreen} />
  </DebitNotesStack.Navigator>
);
